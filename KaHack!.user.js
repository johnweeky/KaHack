// ==UserScript==
// @name         Kahoot Exploit (Mobile Friendly)
// @version      2.1.0
// @description  Show-only Kahoot helper! Highlights correct answers and shows next question preview. No auto-answering - manual clicking only.
// @namespace    https://github.com/johnweeky
// @match        https://kahoot.it/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kahoot.it
// @grant        none
// ==/UserScript==
(function() {
    const stripeLink = 'https://your-stripe-payment-link.com'; // IMPORTANT: Replace with your actual Stripe link
    var Version = '2.1.0';

    var questions = [];
    var info = {
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
    };
    var showAnswers = false;

    // Helper: Finds an element by attribute value.
    function FindByAttributeValue(attribute, value, element_type) {
        element_type = element_type || "*";
        var All = document.getElementsByTagName(element_type);
        for (var i = 0; i < All.length; i++) {
            if (All[i].getAttribute(attribute) == value) { 
                return All[i]; 
            }
        }
    }

    // Sanitize input: Trim whitespace; if it starts with "https//" (missing colon) fix it.
    // If a full URL is provided, return only its last non-empty segment.
    function sanitizeInput(val) {
        val = val.trim();
        if (val.indexOf("https//") === 0) {
            val = val.replace("https//", "https://");
        }
        if (/^https?:\/\//i.test(val)) {
            var parts = val.replace(/^https?:\/\//i, '').split('/');
            return parts.filter(Boolean).pop();
        }
        return val;
    }



    // Reset UI function – clears input, color, questions array, etc.
    function resetUI() {
        inputBox.value = "";
        inputBox.style.backgroundColor = 'white';
        dropdown.style.display = 'none';
        dropdownCloseButton.style.display = 'none';
        questions = [];
        info.numQuestions = 0;
        info.questionNum = -1;
        info.lastAnsweredQuestion = -1;
        questionsLabel.textContent = 'Question 0 / 0';
        // Reset next question preview
        const nextQuestionDisplay = document.getElementById('nextQuestionDisplay');
        if (nextQuestionDisplay) {
            const nextQuestionContainer = nextQuestionDisplay.closest('div');
                if (nextQuestionContainer) {
                    nextQuestionContainer.style.display = 'block';
                }
                nextQuestionDisplay.textContent = 'Loading...';
        }
    }

    // --- UI Creation ---
    const uiElement = document.createElement('div');
    uiElement.className = 'floating-ui';
    uiElement.style.position = 'absolute';
    uiElement.style.top = '5%';
    uiElement.style.left = '5%';
    uiElement.style.width = '33vw';
    uiElement.style.height = 'auto';
    uiElement.style.backgroundColor = '#381272';
    uiElement.style.borderRadius = '1vw';
    uiElement.style.boxShadow = '0px 0px 10px 0px rgba(0, 0, 0, 0.5)';
    uiElement.style.zIndex = '9999';

    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    handle.style.fontSize = '1.5vw';
    // Changed top handle text
    handle.textContent = 'Kahoot';
    handle.style.cursor = 'pointer'; // Make it clickable
    handle.style.color = 'white';
    handle.style.width = '97.5%';
    handle.style.height = '2.5vw';
    handle.style.backgroundColor = '#321066';
    handle.style.borderRadius = '1vw 1vw 0 0';
    handle.style.cursor = 'grab';
    handle.style.textAlign = 'left';
    handle.style.paddingLeft = '2.5%';
    handle.style.lineHeight = '2vw';
    uiElement.appendChild(handle);

    const closeButton = document.createElement('div');
    closeButton.className = 'close-button';
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0';
    closeButton.style.right = '0';
    closeButton.style.width = '12.5%';
    closeButton.style.height = '2.5vw';
    closeButton.style.backgroundColor = 'red';
    closeButton.style.color = 'white';
    closeButton.style.borderRadius = '0 1vw 0 0';
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';
    closeButton.style.alignItems = 'center';
    closeButton.style.cursor = 'pointer';
    handle.appendChild(closeButton);

    const minimizeButton = document.createElement('div');
    minimizeButton.className = 'minimize-button';
    minimizeButton.textContent = '─';
    minimizeButton.style.color = 'white';
    minimizeButton.style.position = 'absolute';
    minimizeButton.style.top = '0';
    minimizeButton.style.right = '12.5%';
    minimizeButton.style.width = '12.5%';
    minimizeButton.style.height = '2.5vw';
    minimizeButton.style.backgroundColor = 'gray';
    minimizeButton.style.borderRadius = '0 0 0 0';
    minimizeButton.style.display = 'flex';
    minimizeButton.style.justifyContent = 'center';
    minimizeButton.style.alignItems = 'center';
    minimizeButton.style.cursor = 'pointer';
    handle.appendChild(minimizeButton);

    // QUIZ ID/NAME
    const headerText = document.createElement('h2');
    headerText.textContent = 'QUIZ ID/NAME';
    headerText.style.display = 'block';
    headerText.style.margin = '1vw';
    headerText.style.textAlign = 'center';
    headerText.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    headerText.style.fontSize = '2vw';
    headerText.style.color = 'white';
    headerText.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    // headerText will be added to mainUIContent later

    // Input container (relative for the dropdown)
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.flexDirection = 'column';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.position = 'relative';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.style.color = 'black';
    inputBox.placeholder = 'Quiz Id/Name of Quiz here...';
    inputBox.style.width = '27.8vw';
    inputBox.style.height = '1.5vw';
    inputBox.style.margin = '0';
    inputBox.style.padding = '0';
    inputBox.style.border = '.1vw solid black';
    inputBox.style.borderRadius = '1vw';
    inputBox.style.outline = 'none';
    inputBox.style.textAlign = 'center';
    inputBox.style.fontSize = '1.15vw';
    inputContainer.appendChild(inputBox);

    // If user manually clears input, reset
    inputBox.addEventListener('input', function() {
        if (inputBox.value.trim() === "") {
            resetUI();
        }
    });

    // Button container for Enter, Persist, Delete
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.marginTop = '0.5vw';
    buttonContainer.style.gap = '0.3vw';
    buttonContainer.style.width = '27.8vw';
    buttonContainer.style.justifyContent = 'space-between';
    
    // Enter button with consistent font
    const enterButton = document.createElement('button');
    enterButton.textContent = 'Enter';
    enterButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif'; 
    enterButton.style.width = '45%';
    enterButton.style.fontSize = '1.15vw';
    enterButton.style.cursor = 'pointer';
    enterButton.addEventListener('click', handleInputChange);
    buttonContainer.appendChild(enterButton);
    
    // Persist button
    const persistButton = document.createElement('button');
    persistButton.textContent = 'Persist';
    persistButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif'; 
    persistButton.style.width = '25%';
    persistButton.style.fontSize = '1.15vw';
    persistButton.style.cursor = 'pointer';
    persistButton.style.backgroundColor = '#4CAF50';
    persistButton.style.color = 'white';
    persistButton.addEventListener('click', persistQuizId);
    buttonContainer.appendChild(persistButton);
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif'; 
    deleteButton.style.width = '25%';
    deleteButton.style.fontSize = '1.15vw';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.backgroundColor = '#f44336';
    deleteButton.style.color = 'white';
    deleteButton.addEventListener('click', deletePersistedQuizId);
    buttonContainer.appendChild(deleteButton);
    
    inputContainer.appendChild(buttonContainer);

    // Persistence functions
    function persistQuizId() {
        const quizId = sanitizeInput(inputBox.value);
        if (quizId.trim() === "") {
            alert("Please enter a Quiz ID first!");
            return;
        }
        localStorage.setItem('kahoot_persisted_quiz', quizId);
        persistButton.style.backgroundColor = '#45a049';
        persistButton.textContent = 'Saved!';
        setTimeout(() => {
            persistButton.style.backgroundColor = '#4CAF50';
            persistButton.textContent = 'Persist';
        }, 2000);
        console.log("Quiz ID persisted:", quizId);
    }
    
    function deletePersistedQuizId() {
        localStorage.removeItem('kahoot_persisted_quiz');
        deleteButton.style.backgroundColor = '#d32f2f';
        deleteButton.textContent = 'Deleted!';
        setTimeout(() => {
            deleteButton.style.backgroundColor = '#f44336';
            deleteButton.textContent = 'Delete';
        }, 2000);
        console.log("Persisted Quiz ID deleted");
    }
    
    function loadPersistedQuizId() {
        const persistedQuiz = localStorage.getItem('kahoot_persisted_quiz');
        if (persistedQuiz) {
            inputBox.value = persistedQuiz;
            inputBox.style.backgroundColor = '#e8f5e8';
            console.log("Loaded persisted Quiz ID:", persistedQuiz);
            // Auto-load the quiz
            setTimeout(() => handleInputChange(), 1000); // Delay to ensure UI is ready
        }
    }

    // Dropdown for fallback suggestions
    const dropdown = document.createElement('div');
    dropdown.style.position = 'absolute';
    dropdown.style.top = 'calc(100% + 0.5vw)';
    dropdown.style.left = '0';
    dropdown.style.width = '27.8vw';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '.1vw solid black';
    dropdown.style.borderRadius = '0.5vw';
    dropdown.style.zIndex = '10000';
    dropdown.style.maxHeight = '30vw';
    dropdown.style.overflowY = 'auto';
    dropdown.style.display = 'none';
    inputContainer.appendChild(dropdown);

    // X button to close dropdown & reset
    const dropdownCloseButton = document.createElement('button');
    dropdownCloseButton.textContent = 'X';
    dropdownCloseButton.style.position = 'absolute';
    dropdownCloseButton.style.top = '-2vw';
    dropdownCloseButton.style.right = '0';
    dropdownCloseButton.style.width = '2vw';
    dropdownCloseButton.style.height = '2vw';
    dropdownCloseButton.style.backgroundColor = 'red';
    dropdownCloseButton.style.color = 'white';
    dropdownCloseButton.style.border = 'none';
    dropdownCloseButton.style.borderRadius = '50%';
    dropdownCloseButton.style.cursor = 'pointer';
    dropdownCloseButton.style.fontSize = '1vw';
    dropdownCloseButton.style.display = 'none';
    dropdownCloseButton.addEventListener('click', function() {
        resetUI();
    });
    inputContainer.appendChild(dropdownCloseButton);

    // inputContainer will be added to mainUIContent later



    // SHOW ANSWERS
    const header3 = document.createElement('h2');
    header3.textContent = 'SHOW ANSWERS';
    header3.style.display = 'block';
    header3.style.margin = '1vw';
    header3.style.textAlign = 'center';
    header3.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header3.style.fontSize = '2vw';
    header3.style.color = 'white';
    header3.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    // header3 will be added to mainUIContent later

    const showAnswersSwitchContainer = document.createElement('div');
    showAnswersSwitchContainer.className = 'switch-container';
    showAnswersSwitchContainer.style.display = 'flex';
    showAnswersSwitchContainer.style.alignItems = 'center';
    showAnswersSwitchContainer.style.justifyContent = 'center';
    // showAnswersSwitchContainer will be added to mainUIContent later

    const showAnswersLabel = document.createElement('span');
    showAnswersLabel.textContent = 'Show Answers';
    showAnswersLabel.className = 'switch-label';
    showAnswersLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    showAnswersLabel.style.fontSize = '1.5vw';
    showAnswersLabel.style.color = 'white';
    showAnswersLabel.style.margin = '2.5vw';
    showAnswersSwitchContainer.appendChild(showAnswersLabel);

    const showAnswersSwitch = document.createElement('label');
    showAnswersSwitch.className = 'switch';
    showAnswersSwitchContainer.appendChild(showAnswersSwitch);

    const showAnswersInput = document.createElement('input');
    showAnswersInput.type = 'checkbox';
    showAnswersInput.addEventListener('change', function() {
        showAnswers = this.checked;
    });
    showAnswersSwitch.appendChild(showAnswersInput);

    const showAnswersSlider = document.createElement('span');
    showAnswersSlider.className = 'slider';
    showAnswersSwitch.appendChild(showAnswersSlider);

    // NEXT QUESTION PREVIEW
    const nextQuestionContainer = document.createElement('div');
    nextQuestionContainer.style.margin = '1vw';
    nextQuestionContainer.style.padding = '1vw';
    nextQuestionContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    nextQuestionContainer.style.borderRadius = '0.5vw';
    nextQuestionContainer.style.textAlign = 'center';
    // nextQuestionContainer will be added to mainUIContent later

    const nextQuestionLabel = document.createElement('h3');
    nextQuestionLabel.textContent = 'NEXT QUESTION PREVIEW';
    nextQuestionLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    nextQuestionLabel.style.fontSize = '1.5vw';
    nextQuestionLabel.style.color = 'white';
    nextQuestionLabel.style.margin = '0.5vw 0';
    nextQuestionContainer.appendChild(nextQuestionLabel);

    const nextQuestionDisplay = document.createElement('div');
    nextQuestionDisplay.id = 'nextQuestionDisplay';
    nextQuestionDisplay.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    nextQuestionDisplay.style.fontSize = '1.8vw';
    nextQuestionDisplay.style.color = '#00ff00';
    nextQuestionDisplay.style.fontWeight = 'bold';
    nextQuestionDisplay.style.margin = '0.5vw 0';
    nextQuestionDisplay.style.textShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
    nextQuestionDisplay.textContent = 'Loading...';
    nextQuestionContainer.appendChild(nextQuestionDisplay);

    // CSS style including media queries for mobile
    const style = document.createElement('style');
    style.textContent = `
    .custom-slider {
        background: white;
        border: none;
        outline: none;
        cursor: ew-resize;
        appearance: none;
        height: 0;
    }
    .custom-slider::-webkit-slider-thumb {
        appearance: none;
        width: 1.75vw;
        height: 1.75vw;
        background-color: rgb(47, 47, 47);
        border-radius: 50%;
        cursor: ew-resize;
        margin-top: -0.5vw;
    }
    .custom-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 0.75vw;
        background-color: white;
        cursor: ew-resize;
        border-radius: 1vw;
        background: linear-gradient(to right, red, yellow, limegreen);
    }
    :root {
      --switch-width: 5.9vw;
      --switch-height: 3.3vw;
      --slider-size: 2.5vw;
      --slider-thumb-size: 1.3vw;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: var(--switch-width);
      height: var(--switch-height);
      margin: 2.5vw;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: red;
      transition: 0.8s;
      border-radius: .5vw;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: var(--slider-size);
      width: var(--slider-size);
      left: calc(var(--slider-thumb-size) / 3);
      bottom: calc(var(--slider-thumb-size) / 3);
      background-color: rgb(43, 43, 43);
      transition: 0.8s;
      border-radius: .5vw;
    }
    input:checked + .slider {
      background-color: green;
    }
    input:focus + .slider {
      box-shadow: 0 0 1px green;
    }
    input:checked + .slider:before {
      transform: translateX(calc(var(--slider-size)));
    }

    /* MEDIA QUERY for narrower screens (phones, small tablets). */
    @media (max-width: 768px) {
      .floating-ui {
        width: 80vw !important;
        left: 10vw !important;
        top: 5vh !important;
        border-radius: 3vw !important;
      }
      .handle {
        font-size: 4vw !important;
        height: 8vw !important;
        line-height: 6vw !important;
        border-radius: 3vw 3vw 0 0 !important;
      }
      .minimize-button, .close-button {
        width: 10vw !important;
        height: 8vw !important;
        font-size: 4vw !important;
      }
      .floating-ui h2 {
        font-size: 4vw !important;
        margin: 2vw !important;
      }
      .floating-ui input[type="text"] {
        font-size: 3vw !important;
        width: 60vw !important;
        height: 6vw !important;
        border-radius: 2vw !important;
      }
      .floating-ui button {
        font-family: "Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
        font-size: 3vw !important;
        height: 7vw !important;
        border-radius: 2vw !important;
      }
      /* Button container on mobile */
      .floating-ui div[style*="display: flex"][style*="gap: 0.3vw"] {
        width: 60vw !important;
        gap: 1vw !important;
      }
      .floating-ui div[style*="display: flex"][style*="gap: 0.3vw"] button {
        font-size: 2.5vw !important;
      }
      .floating-ui .custom-slider::-webkit-slider-thumb {
        width: 4vw !important;
        height: 4vw !important;
        margin-top: -1.3vw !important;
      }
      .floating-ui .custom-slider::-webkit-slider-runnable-track {
        height: 2vw !important;
      }
      :root {
        --switch-width: 12vw;
        --switch-height: 6vw;
        --slider-size: 4vw;
        --slider-thumb-size: 2vw;
      }
      .switch {
        margin: 3vw !important;
      }
      .floating-ui h1,
      .floating-ui h2,
      .floating-ui span {
        font-size: 3vw !important;
      }
      /* For the dropdown on mobile, let's make it wider. */
      .floating-ui div[style*="position: absolute;"][style*="z-index: 10000"] {
        width: 60vw !important;
      }
      /* Adjust X button position on mobile */
      .floating-ui button[style*="position: absolute;"][style*="background-color: red"] {
        top: -3vw !important;
        right: -3vw !important;
        width: 6vw !important;
        height: 6vw !important;
        font-size: 3vw !important;
      }
      
    }
    `;
    document.head.appendChild(style);

    // INFO
    const header4 = document.createElement('h2');
    header4.textContent = 'INFO';
    header4.style.display = 'block';
    header4.style.margin = '1vw';
    header4.style.textAlign = 'center';
    header4.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header4.style.fontSize = '2vw';
    header4.style.color = 'white';
    header4.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    // header4 will be added to mainUIContent later

    // questionsLabel
    const questionsLabel = document.createElement('span');
    questionsLabel.textContent = 'Question 0 / 0';
    questionsLabel.style.display = 'block';
    questionsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    questionsLabel.style.fontSize = '1.5vw';
    questionsLabel.style.textAlign = 'center';
    questionsLabel.style.margin = '1vw';
    questionsLabel.style.marginLeft = '1vw';
    questionsLabel.style.marginRight = '1vw';
    questionsLabel.style.color = 'white';
    // questionsLabel will be added to mainUIContent later

    // Removed input lag text from the UI entirely

    // Version label removed


    closeButton.addEventListener('click', () => {
        document.body.removeChild(uiElement);
        showAnswers = false;
    });

    let isMinimized = false;
    minimizeButton.addEventListener('click', () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            // Hide main UI elements
            headerText.style.display = 'none';
            header3.style.display = 'none';
            header4.style.display = 'none';
            inputContainer.style.display = 'none';
            questionsLabel.style.display = 'none';
            showAnswersSwitchContainer.style.display = 'none';
            nextQuestionContainer.style.display = 'none';
            
            uiElement.style.height = '2.5vw';
            handle.style.height = '100%';
            closeButton.style.height = '100%';
            minimizeButton.style.height = '100%';
        } else {
            // Show main UI elements
            headerText.style.display = 'block';
            header3.style.display = 'block';
            header4.style.display = 'block';
            inputContainer.style.display = 'flex';
            questionsLabel.style.display = 'block';
            showAnswersSwitchContainer.style.display = 'flex';
            nextQuestionContainer.style.display = 'block';
            
            handle.style.height = '2.5vw';
            uiElement.style.height = 'auto';
            closeButton.style.height = '2.5vw';
            minimizeButton.style.height = '2.5vw';
        }
    });

    // Add click handler to handle title for hiding UI
    handle.addEventListener('click', function(e) {
        // Only hide if clicking on the text part, not the buttons
        if (e.target === handle) {
            uiElement.style.display = 'none';
            langSelector.style.display = 'block';
        }
    });

    let isDragging = false;
    let offsetX, offsetY;
    handle.addEventListener('mousedown', (e) => {
        // Prevent hiding when dragging
        if (e.target === handle) {
            isDragging = true;
            offsetX = e.clientX - uiElement.getBoundingClientRect().left;
            offsetY = e.clientY - uiElement.getBoundingClientRect().top;
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            uiElement.style.left = x + 'px';
            uiElement.style.top = y + 'px';
        }
    });
    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            // Prevent click event from firing if we were dragging
            e.stopPropagation();
        }
    });

    // --- Fallback Dropdown Search ---
    function searchPublicUUID(searchTerm) {
        const searchUrl = 'https://damp-leaf-16aa.johnwee.workers.dev/rest/kahoots/?query=' + encodeURIComponent(searchTerm);
        console.log("Fallback search URL:", searchUrl);
        fetch(searchUrl)
          .then(response => response.json())
          .then(data => {
              console.log("Fallback search data:", data);
              let results = (data.entities && data.entities.length > 0) ? data.entities : [];
              dropdown.innerHTML = "";
              if (Array.isArray(results) && results.length > 0) {
                  results.forEach(entity => {
                      let card = entity.card || {};
                      let displayTitle = card.title || card.name || "No title";
                      let displayCover = card.cover || card.image || 'https://dummyimage.com/50x50/ccc/fff.png&text=No+Image';
                      let quizUUID = card.uuid || card.id || "";
                      const item = document.createElement('div');
                      item.style.display = 'flex';
                      item.style.alignItems = 'center';
                      item.style.padding = '0.5vw';
                      item.style.cursor = 'pointer';
                      item.addEventListener('mouseover', function() {
                          item.style.backgroundColor = '#ddd';
                      });
                      item.addEventListener('mouseout', function() {
                          item.style.backgroundColor = 'white';
                      });
                      
                      const img = document.createElement('img');
                      img.src = displayCover;
                      img.alt = displayTitle;
                      img.style.width = '3vw';
                      img.style.height = '3vw';
                      img.style.marginRight = '1vw';
                      
                      const text = document.createElement('span');
                      text.textContent = displayTitle;
                      text.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                      item.appendChild(img);
                      item.appendChild(text);
                      
                      item.addEventListener('click', function() {
                          console.log("Selected entity:", card);
                          inputBox.value = quizUUID;
                          dropdown.style.display = 'none';
                          dropdownCloseButton.style.display = 'none';
                          handleInputChange();
                      });
                      
                      dropdown.appendChild(item);
                  });
                  dropdown.style.display = 'block';
                  dropdownCloseButton.style.display = 'block';
              } else {
                  dropdown.style.display = 'none';
                  dropdownCloseButton.style.display = 'none';
              }
          })
          .catch(err => {
              console.error("Fallback search error:", err);
              dropdown.style.display = 'none';
              dropdownCloseButton.style.display = 'none';
          });
    }

    // --- Lookup Function ---
    function handleInputChange() {
        var rawInput = inputBox.value;
        var quizID = sanitizeInput(rawInput);
        const url = 'https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/' + encodeURIComponent(quizID);
        console.log("Direct lookup URL:", url);
        if (quizID !== "") {
            fetch(url)
                .then(response => {
                    if (!response.ok) { throw new Error('Direct lookup failed'); }
                    return response.json();
                })
                .then(data => {
                    console.log("Direct lookup data:", data);
                    inputBox.style.backgroundColor = 'green';
                    dropdown.style.display = 'none';
                    dropdownCloseButton.style.display = 'none';
                    questions = parseQuestions(data.questions);
                    info.numQuestions = questions.length;
                })
                .catch(error => {
                    console.error("Direct lookup error:", error);
                    inputBox.style.backgroundColor = 'red';
                    info.numQuestions = 0;
                    // Fallback: offer public search suggestions.
                    searchPublicUUID(quizID);
                });
        } else {
            inputBox.style.backgroundColor = 'white';
            info.numQuestions = 0;
        }
    }

    // Main UI content container
    const mainUIContent = document.createElement('div');
    mainUIContent.id = 'mainUIContent';
    
    // Move all existing UI elements into mainUIContent
    mainUIContent.appendChild(headerText);
    mainUIContent.appendChild(inputContainer);
    mainUIContent.appendChild(header3);
    mainUIContent.appendChild(showAnswersSwitchContainer);
    mainUIContent.appendChild(nextQuestionContainer);
    mainUIContent.appendChild(header4);
    mainUIContent.appendChild(questionsLabel);

    function showMainUI() {
        // Append main UI
        uiElement.appendChild(mainUIContent);
        
        // Load persisted quiz ID after main UI is shown
        setTimeout(() => loadPersistedQuizId(), 500);
    }

    function createPaywallUI() {
        const paywallContainer = document.createElement('div');
        paywallContainer.id = 'paywallContainer';
        paywallContainer.style.display = 'flex';
        paywallContainer.style.flexDirection = 'column';
        paywallContainer.style.alignItems = 'center';
        paywallContainer.style.padding = '2vw';
        paywallContainer.style.textAlign = 'center';

        const paywallTitle = document.createElement('h2');
        paywallTitle.textContent = 'Hack Kahoot → Get Answers Instantly';
        paywallTitle.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
        paywallTitle.style.fontSize = '2.5vw';
        paywallTitle.style.color = 'white';
        paywallTitle.style.margin = '1vw';
        paywallTitle.style.textShadow = `
          -1px -1px 0 rgb(47, 47, 47),
          1px -1px 0 rgb(47, 47, 47),
          -1px 1px 0 rgb(47, 47, 47),
          1px 1px 0 rgb(47, 47, 47)
        `;
        paywallContainer.appendChild(paywallTitle);

        const paywallDescription = document.createElement('p');
        paywallDescription.textContent = 'Unlock lifetime access to instant answers and next question previews for just $5.';
        paywallDescription.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
        paywallDescription.style.fontSize = '1.5vw';
        paywallDescription.style.color = 'white';
        paywallDescription.style.margin = '1vw';
        paywallContainer.appendChild(paywallDescription);

        const unlockButton = document.createElement('button');
        unlockButton.textContent = 'Unlock Now for $5';
        unlockButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
        unlockButton.style.width = '20vw';
        unlockButton.style.height = '3vw';
        unlockButton.style.fontSize = '1.5vw';
        unlockButton.style.cursor = 'pointer';
        unlockButton.style.backgroundColor = '#4CAF50';
        unlockButton.style.color = 'white';
        unlockButton.style.border = 'none';
        unlockButton.style.borderRadius = '1vw';
        unlockButton.style.margin = '1vw';
        unlockButton.addEventListener('click', () => {
            window.location.href = stripeLink;
        });
        paywallContainer.appendChild(unlockButton);

        return paywallContainer;
    }

    function showPaywallUI() {
        uiElement.innerHTML = ''; // Clear existing content
        uiElement.appendChild(handle);
        uiElement.appendChild(createPaywallUI());
    }

    function initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('paid')) {
            localStorage.setItem('kahoot_unlocked', 'true');
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const isUnlocked = localStorage.getItem('kahoot_unlocked') === 'true';

        if (isUnlocked) {
            showMainUI();
        } else {
            showPaywallUI();
        }
    }

    // Initialize UI
    initialize();

    // Create language selector (hidden UI state)
    const langSelector = document.createElement('div');
    langSelector.style.position = 'absolute';
    langSelector.style.top = '10px';
    langSelector.style.right = '10px';
    langSelector.style.width = '40px';
    langSelector.style.height = '20px';
    langSelector.style.backgroundColor = '#f0f0f0';
    langSelector.style.border = '1px solid #ccc';
    langSelector.style.borderRadius = '3px';
    langSelector.style.cursor = 'pointer';
    langSelector.style.fontSize = '10px';
    langSelector.style.textAlign = 'center';
    langSelector.style.lineHeight = '20px';
    langSelector.style.color = '#666';
    langSelector.style.zIndex = '9998';
    langSelector.style.display = 'none'; // Hidden by default
    langSelector.textContent = 'EN';
    langSelector.title = 'Language Selector';

    // Add click handler to show UI
    langSelector.addEventListener('click', function() {
        uiElement.style.display = 'block';
        langSelector.style.display = 'none';
    });

    document.body.appendChild(langSelector);
    document.body.appendChild(uiElement);
    
    // Quiz loading will be handled after authentication

    function parseQuestions(questionsJson){
        let questions = [];
        questionsJson.forEach(function (question){
            let q = {type: question.type, time: question.time};
            if (['quiz', 'multiple_select_quiz'].includes(question.type)){
                var i = 0;
                q.answers = [];
                q.incorrectAnswers = [];
                question.choices.forEach(function(choice){
                    if (choice.correct) {
                        q.answers.push(i);
                    } else {
                        q.incorrectAnswers.push(i);
                    }
                    i++;
                });
            }
            if (question.type == 'open_ended') {
                q.answers = [];
                question.choices.forEach(function(choice){
                    q.answers.push(choice.answer);
                });
            }
            questions.push(q);
        });
        return questions;
    }

    function onQuestionStart(){
        var question = questions[info.questionNum];
        if (showAnswers){
            highlightAnswers(question);
        }
        // Update next question preview
        updateNextQuestionPreview();
    }

    function highlightAnswers(question){
        question.answers.forEach(function (answer) {
            FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button").style.backgroundColor = 'rgb(0, 255, 0)';
        });
        question.incorrectAnswers.forEach(function (answer) {
            FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button").style.backgroundColor = 'rgb(255, 0, 0)';
        });
    }

    function updateNextQuestionPreview() {
        const nextQuestionDisplay = document.getElementById('nextQuestionDisplay');
        if (!nextQuestionDisplay) return;

        const nextQuestionContainer = nextQuestionDisplay.closest('div');
        if (nextQuestionContainer) {
            nextQuestionContainer.style.display = 'block';
        }

        const nextQuestionIndex = info.questionNum + 1;
        
        if (nextQuestionIndex >= questions.length || nextQuestionIndex < 0) {
            nextQuestionDisplay.textContent = 'No more questions';
            return;
        }

        const nextQuestion = questions[nextQuestionIndex];
        if (!nextQuestion || !nextQuestion.answers) {
            nextQuestionDisplay.textContent = 'Question data not available';
            return;
        }

        // Format: Q2: 1/3 (for single answer) or Q2: 1/2/4 (for multiple answers)
        let answerText = `Q${nextQuestionIndex + 1}: `;
        
        if (nextQuestion.type === 'quiz') {
            // Single answer
            answerText += (nextQuestion.answers[0] + 1).toString();
        } else if (nextQuestion.type === 'multiple_select_quiz') {
            // Multiple answers
            const answerNumbers = nextQuestion.answers.map(answer => (answer + 1).toString());
            answerText += answerNumbers.join('/');
        } else {
            answerText += 'Special Question';
        }

        nextQuestionDisplay.textContent = answerText;
    }

    let isHidden = false;
    document.addEventListener('keydown', (event) => {
        console.log(`Key pressed: "${event.key}"`);
        let overlay = document.querySelector(".floating-ui");
        if (!overlay) return console.log("Overlay not found!");
        if (event.key === ",") {
            console.log("Hiding overlay...");
            overlay.style.display = "none";
        }
        if (event.key === ".") {
            console.log("Showing overlay...");
            overlay.style.display = "block";
        }
    });

    // Interval loop: checks question state, auto-answer logic, etc.
    setInterval(function () {
        var textElement = FindByAttributeValue("data-functional-selector", "question-index-counter", "div");
        if (textElement){
            info.questionNum = +textElement.textContent - 1;
        }
        if (FindByAttributeValue("data-functional-selector", 'answer-0', "button") && info.lastAnsweredQuestion != info.questionNum) {
            info.lastAnsweredQuestion = info.questionNum;
            onQuestionStart();
        }
        // Update next question preview whenever question changes
        updateNextQuestionPreview();
        questionsLabel.textContent = 'Question ' + (info.questionNum + 1) + ' / ' + info.numQuestions;
    }, 1);
})();
