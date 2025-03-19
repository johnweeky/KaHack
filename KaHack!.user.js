// ==UserScript==
// @name         KaHack!
// @version      1.0.26
// @description  A hack for kahoot.it! Press Enter after typing a Quiz ID or name to perform lookup.
// @namespace    https://github.com/johnweeky
// @updateURL    https://github.com/johnweeky/KaHack/raw/main/KaHack!.meta.js
// @downloadURL  https://github.com/johnweeky/KaHack/raw/main/KaHack!.user.js
// @author       johnweeky
// @match        https://kahoot.it/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kahoot.it
// @grant        none
// ==/UserScript==

(function() {
    "use strict";

    var Version = '1.0.26';
    var questions = [];
    var info = {
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
        defaultIL: true,
        ILSetQuestion: -1,
    };
    var PPT = 950;
    var Answered_PPT = 950;
    var autoAnswer = false;
    var showAnswers = false;
    var inputLag = 100;

    // Helper: find element by attribute value.
    function FindByAttributeValue(attribute, value, element_type) {
        element_type = element_type || "*";
        var All = document.getElementsByTagName(element_type);
        for (var i = 0; i < All.length; i++) {
            if (All[i].getAttribute(attribute) === value) {
                return All[i];
            }
        }
    }

    // Insert custom CSS for our UI.
    var style = document.createElement('style');
    style.textContent = `
    .floating-ui {
        position: absolute;
        top: 5%;
        left: 5%;
        width: 33vw;
        background-color: #381272;
        border-radius: 1vw;
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
        z-index: 9999;
        padding-bottom: 1vw;
        font-family: 'Montserrat', sans-serif;
    }
    .floating-ui .handle {
        font-size: 1.5vw;
        color: white;
        width: 97.5%;
        height: 2.5vw;
        background-color: #321066;
        border-radius: 1vw 1vw 0 0;
        cursor: grab;
        text-align: left;
        padding-left: 2.5%;
        line-height: 2vw;
    }
    .floating-ui .close-button, .floating-ui .minimize-button {
        position: absolute;
        top: 0;
        height: 2.5vw;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-size: 1.5vw;
        color: white;
    }
    .floating-ui .close-button {
        right: 0;
        width: 12.5%;
        background-color: red;
        border-radius: 0 1vw 0 0;
    }
    .floating-ui .minimize-button {
        right: 12.5%;
        width: 12.5%;
        background-color: gray;
    }
    .floating-ui h2 {
        margin: 1vw;
        text-align: center;
        font-size: 2vw;
        color: white;
        text-shadow: -1px -1px 0 #2F2F2F, 1px -1px 0 #2F2F2F, -1px 1px 0 #2F2F2F, 1px 1px 0 #2F2F2F;
    }
    .floating-ui input[type="text"] {
        color: black;
        width: 27.8vw;
        height: 1.5vw;
        border: 0.1vw solid black;
        border-radius: 1vw;
        outline: none;
        text-align: center;
        font-size: 1.15vw;
        margin-bottom: 0.5vw;
    }
    .floating-ui .dropdown {
        position: relative;
        width: 27.8vw;
        max-height: 10vw;
        overflow-y: auto;
        background-color: white;
        border: 1px solid black;
        z-index: 10000;
        display: none;
    }
    .floating-ui .dropdown-item {
        display: flex;
        align-items: center;
        padding: 0.5vw;
        cursor: pointer;
    }
    .floating-ui .dropdown-item:hover {
        background-color: #ddd;
    }
    .floating-ui .dropdown-item img {
        width: 3vw;
        height: 3vw;
        margin-right: 1vw;
    }
    .floating-ui .slider-container {
        width: 80%;
        margin: 1vw auto;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .floating-ui .custom-slider {
        width: 70%;
        margin: 0 1vw;
        cursor: ew-resize;
    }
    .floating-ui .switch-container {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 1vw;
    }
    .floating-ui .switch-label {
        font-size: 1.5vw;
        color: white;
        margin: 0 2.5vw;
    }
    .floating-ui .info-label, .floating-ui h1 {
        text-align: center;
        margin: 1vw;
        color: white;
    }
    `;
    document.head.appendChild(style);

    // Create main container.
    const uiElement = document.createElement('div');
    uiElement.className = 'floating-ui';

    // Create header handle.
    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.textContent = 'KaHack!';
    uiElement.appendChild(handle);

    // Create close and minimize buttons.
    const closeButton = document.createElement('div');
    closeButton.className = 'close-button';
    closeButton.textContent = '✕';
    handle.appendChild(closeButton);

    const minimizeButton = document.createElement('div');
    minimizeButton.className = 'minimize-button';
    minimizeButton.textContent = '─';
    handle.appendChild(minimizeButton);

    // Main title header.
    const header = document.createElement('h2');
    header.textContent = 'QUIZ ID';
    uiElement.appendChild(header);

    // Input container and text box.
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.flexDirection = 'column';
    inputContainer.style.alignItems = 'center';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.placeholder = 'Enter Quiz ID or name...';
    inputContainer.appendChild(inputBox);

    // Dropdown for public search results.
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    inputContainer.appendChild(dropdown);

    uiElement.appendChild(inputContainer);

    // Points header.
    const header2 = document.createElement('h2');
    header2.textContent = 'POINTS PER QUESTION';
    uiElement.appendChild(header2);

    // Slider container.
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = 'Points per Question: 950';
    sliderContainer.appendChild(pointsLabel);
    const pointsSlider = document.createElement('input');
    pointsSlider.type = 'range';
    pointsSlider.min = '500';
    pointsSlider.max = '1000';
    pointsSlider.value = '950';
    pointsSlider.className = 'custom-slider';
    sliderContainer.appendChild(pointsSlider);
    uiElement.appendChild(sliderContainer);

    pointsSlider.addEventListener('input', () => {
        const points = +pointsSlider.value;
        PPT = points;
        pointsLabel.textContent = 'Points per Question: ' + points;
    });

    // Answering header.
    const header3 = document.createElement('h2');
    header3.textContent = 'ANSWERING';
    uiElement.appendChild(header3);

    // Auto answer switch.
    const autoAnswerSwitchContainer = document.createElement('div');
    autoAnswerSwitchContainer.className = 'switch-container';
    const autoAnswerLabel = document.createElement('span');
    autoAnswerLabel.className = 'switch-label';
    autoAnswerLabel.textContent = 'Auto Answer';
    autoAnswerSwitchContainer.appendChild(autoAnswerLabel);
    const autoAnswerSwitch = document.createElement('label');
    autoAnswerSwitch.className = 'switch';
    const autoAnswerInput = document.createElement('input');
    autoAnswerInput.type = 'checkbox';
    autoAnswerInput.addEventListener('change', function() {
        autoAnswer = this.checked;
        info.ILSetQuestion = info.questionNum;
    });
    autoAnswerSwitch.appendChild(autoAnswerInput);
    const autoAnswerSlider = document.createElement('span');
    autoAnswerSlider.className = 'slider';
    autoAnswerSwitch.appendChild(autoAnswerSlider);
    autoAnswerSwitchContainer.appendChild(autoAnswerSwitch);
    uiElement.appendChild(autoAnswerSwitchContainer);

    // Show answers switch.
    const showAnswersSwitchContainer = document.createElement('div');
    showAnswersSwitchContainer.className = 'switch-container';
    const showAnswersLabel = document.createElement('span');
    showAnswersLabel.className = 'switch-label';
    showAnswersLabel.textContent = 'Show Answers';
    showAnswersSwitchContainer.appendChild(showAnswersLabel);
    const showAnswersSwitch = document.createElement('label');
    showAnswersSwitch.className = 'switch';
    const showAnswersInput = document.createElement('input');
    showAnswersInput.type = 'checkbox';
    showAnswersInput.addEventListener('change', function() {
        showAnswers = this.checked;
    });
    showAnswersSwitch.appendChild(showAnswersInput);
    const showAnswersSlider = document.createElement('span');
    showAnswersSlider.className = 'slider';
    showAnswersSwitch.appendChild(showAnswersSlider);
    showAnswersSwitchContainer.appendChild(showAnswersSwitch);
    uiElement.appendChild(showAnswersSwitchContainer);

    // INFO header.
    const header4 = document.createElement('h2');
    header4.textContent = 'INFO';
    uiElement.appendChild(header4);

    // Info labels.
    const questionsLabel = document.createElement('span');
    questionsLabel.className = 'info-label';
    questionsLabel.textContent = 'Question 0 / 0';
    uiElement.appendChild(questionsLabel);

    const inputLagLabel = document.createElement('span');
    inputLagLabel.className = 'info-label';
    inputLagLabel.textContent = 'Input lag: 125 ms';
    uiElement.appendChild(inputLagLabel);

    const versionLabel = document.createElement('h1');
    versionLabel.textContent = 'KaHack! V' + Version;
    uiElement.appendChild(versionLabel);

    // GitHub links.
    const githubContainer = document.createElement('div');
    githubContainer.style.textAlign = 'center';
    githubContainer.style.marginTop = '1vw';
    const githubLabel = document.createElement('span');
    githubLabel.textContent = 'GitHub: ';
    githubContainer.appendChild(githubLabel);
    const githubUrl = document.createElement('a');
    githubUrl.textContent = 'John Wee';
    githubUrl.href = 'https://johnwee.co';
    githubUrl.target = '_blank';
    githubContainer.appendChild(githubUrl);
    const githubUrl2 = document.createElement('a');
    githubUrl2.textContent = 'johnweeky';
    githubUrl2.href = 'https://github.com/johnweeky';
    githubUrl2.target = '_blank';
    githubContainer.appendChild(githubUrl2);
    uiElement.appendChild(githubContainer);

    // Append UI to the document.
    document.body.appendChild(uiElement);

    // Close and minimize button events.
    closeButton.addEventListener('click', () => {
        document.body.removeChild(uiElement);
        autoAnswer = false;
        showAnswers = false;
    });
    let isMinimized = false;
    minimizeButton.addEventListener('click', () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            header.style.display = 'none';
            header2.style.display = 'none';
            header3.style.display = 'none';
            header4.style.display = 'none';
            inputContainer.style.display = 'none';
            questionsLabel.style.display = 'none';
            versionLabel.style.display = 'none';
            inputLagLabel.style.display = 'none';
            githubContainer.style.display = 'none';
            sliderContainer.style.display = 'none';
            autoAnswerSwitchContainer.style.display = 'none';
            showAnswersSwitchContainer.style.display = 'none';
            uiElement.style.height = '2.5vw';
            handle.style.height = '100%';
            closeButton.style.height = '100%';
            minimizeButton.style.height = '100%';
        } else {
            header.style.display = 'block';
            header2.style.display = 'block';
            header3.style.display = 'block';
            header4.style.display = 'block';
            inputContainer.style.display = 'flex';
            questionsLabel.style.display = 'block';
            versionLabel.style.display = 'block';
            inputLagLabel.style.display = 'block';
            githubContainer.style.display = 'block';
            sliderContainer.style.display = 'flex';
            autoAnswerSwitchContainer.style.display = 'flex';
            showAnswersSwitchContainer.style.display = 'flex';
            uiElement.style.height = 'auto';
            handle.style.height = '2.5vw';
            closeButton.style.height = '2.5vw';
            minimizeButton.style.height = '2.5vw';
        }
    });

    // Make the UI draggable.
    let isDragging = false, offsetX, offsetY;
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - uiElement.getBoundingClientRect().left;
        offsetY = e.clientY - uiElement.getBoundingClientRect().top;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            uiElement.style.left = (e.clientX - offsetX) + 'px';
            uiElement.style.top = (e.clientY - offsetY) + 'px';
        }
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Parse questions JSON.
    function parseQuestions(questionsJson) {
        let qs = [];
        questionsJson.forEach(function(question) {
            let q = { type: question.type, time: question.time };
            if (['quiz', 'multiple_select_quiz'].includes(question.type)) {
                var i = 0;
                q.answers = [];
                q.incorrectAnswers = [];
                question.choices.forEach(function(choice) {
                    if (choice.correct) {
                        q.answers.push(i);
                    } else {
                        q.incorrectAnswers.push(i);
                    }
                    i++;
                });
            }
            if (question.type === 'open_ended') {
                q.answers = [];
                question.choices.forEach(function(choice) {
                    q.answers.push(choice.answer);
                });
            }
            qs.push(q);
        });
        return qs;
    }

    // --- Input Lookup ---
    // Before lookup, sanitize the input.
    function sanitizeInput(val) {
        let trimmed = val.trim();
        // If the input starts with http or https, extract the last segment (assumed to be the quiz id)
        if (/^https?:\/\//i.test(trimmed)) {
            try {
                let urlObj = new URL(trimmed);
                let parts = urlObj.pathname.split('/');
                trimmed = parts.pop() || parts.pop(); // pop last segment (or next if empty)
            } catch(e) {
                // If URL parsing fails, return the original trimmed string.
            }
        }
        return trimmed;
    }

    // This function is triggered when the user presses Enter.
    function handleInputChange() {
        let rawInput = inputBox.value;
        let inputVal = sanitizeInput(rawInput);
        if (inputVal === "" || inputVal.length < 3) {
            dropdown.style.display = 'none';
            inputBox.style.backgroundColor = 'white';
            info.numQuestions = 0;
            return;
        }
        // Try direct lookup via API proxy.
        const directUrl = 'https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/' + encodeURIComponent(inputVal);
        fetch(directUrl)
            .then(response => {
                if (!response.ok) { throw new Error('Not Found'); }
                return response.json();
            })
            .then(data => {
                dropdown.style.display = 'none';
                inputBox.style.backgroundColor = 'green';
                questions = parseQuestions(data.questions);
                info.numQuestions = questions.length;
            })
            .catch(error => {
                inputBox.style.backgroundColor = 'red';
                info.numQuestions = 0;
                // If direct lookup fails, perform a public search.
                searchPublicUUID(inputVal);
            });
    }

    // Public search: query Kahoot's public API.
    function searchPublicUUID(searchTerm) {
        const searchUrl = 'https://kahoot.it/rest/kahoots/?query=' + encodeURIComponent(searchTerm);
        fetch(searchUrl)
            .then(response => response.json())
            .then(data => {
                dropdown.innerHTML = "";
                if (data.entities && data.entities.length > 0) {
                    data.entities.slice(0, 5).forEach(entity => {
                        const item = document.createElement('div');
                        item.className = 'dropdown-item';
                        const img = document.createElement('img');
                        img.src = entity.cover || '';
                        img.alt = entity.title;
                        item.appendChild(img);
                        const text = document.createElement('span');
                        text.textContent = entity.title;
                        item.appendChild(text);
                        item.addEventListener('click', function() {
                            inputBox.value = entity.uuid;
                            dropdown.style.display = 'none';
                            inputBox.style.backgroundColor = 'yellow';
                            handleInputChange();
                        });
                        dropdown.appendChild(item);
                    });
                    dropdown.style.display = 'block';
                } else {
                    dropdown.style.display = 'none';
                }
            })
            .catch(err => {
                console.error(err);
                dropdown.style.display = 'none';
            });
    }

    // Only trigger lookup on Enter key.
    inputBox.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            handleInputChange();
        }
    });

    // --- Question handling (auto-answering and highlighting) ---
    function onQuestionStart(){
        console.log(inputLag);
        var question = questions[info.questionNum];
        if (showAnswers) {
            highlightAnswers(question);
        }
        if (autoAnswer) {
            answer(question, (question.time - question.time / (500/(PPT-500))) - inputLag);
        }
    }

    function highlightAnswers(question) {
        question.answers.forEach(function(answer) {
            setTimeout(function() {
                let btn = FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button");
                if(btn) btn.style.backgroundColor = 'rgb(0, 255, 0)';
            }, 0);
        });
        question.incorrectAnswers.forEach(function(answer) {
            setTimeout(function() {
                let btn = FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button");
                if(btn) btn.style.backgroundColor = 'rgb(255, 0, 0)';
            }, 0);
        });
    }

    function answer(question, time) {
        Answered_PPT = PPT;
        var delay = (question.type === 'multiple_select_quiz') ? 60 : 0;
        setTimeout(function() {
            if (question.type === 'quiz') {
                const key = (+question.answers[0] + 1).toString();
                const event = new KeyboardEvent('keydown', { key: key });
                window.dispatchEvent(event);
            }
            if (question.type === 'multiple_select_quiz') {
                question.answers.forEach(function(answer) {
                    setTimeout(function() {
                        const key = (+answer + 1).toString();
                        const event = new KeyboardEvent('keydown', { key: key });
                        window.dispatchEvent(event);
                    }, 0);
                });
                setTimeout(function() {
                    let btn = FindByAttributeValue("data-functional-selector", 'multi-select-submit-button', "button");
                    if(btn) btn.click();
                }, 0);
            }
        }, time - delay);
    }

    // Toggle overlay visibility with comma (hide) and period (show).
    document.addEventListener('keydown', (event) => {
        let overlay = document.querySelector(".floating-ui");
        if (!overlay) return;
        if (event.key === ",") {
            overlay.style.display = "none";
        }
        if (event.key === ".") {
            overlay.style.display = "block";
        }
    });

    // Update question counter and input lag periodically.
    setInterval(function () {
        var textElement = FindByAttributeValue("data-functional-selector", "question-index-counter", "div");
        if (textElement) {
            info.questionNum = +textElement.textContent - 1;
        }
        if (FindByAttributeValue("data-functional-selector", 'answer-0', "button") && info.lastAnsweredQuestion !== info.questionNum) {
            info.lastAnsweredQuestion = info.questionNum;
            onQuestionStart();
        }
        if (autoAnswer) {
            if (info.ILSetQuestion !== info.questionNum) {
                var ppt = Answered_PPT;
                if (ppt > 987) ppt = 1000;
                var incrementElement = FindByAttributeValue("data-functional-selector", "score-increment", "span");
                if (incrementElement) {
                    info.ILSetQuestion = info.questionNum;
                    var increment = +incrementElement.textContent.split(" ")[1];
                    if (increment !== 0) {
                        inputLag += (ppt - increment) * 15;
                        if (inputLag < 0) {
                            inputLag -= (ppt - increment) * 15;
                            inputLag += (ppt - increment / 2) * 15;
                        }
                        inputLag = Math.round(inputLag);
                    }
                }
            }
        }
        questionsLabel.textContent = 'Question ' + (info.questionNum + 1) + ' / ' + info.numQuestions;
        inputLagLabel.textContent = 'Input lag: ' + inputLag + ' ms';
    }, 1);

})();
