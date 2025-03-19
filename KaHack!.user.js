// ==UserScript==
// @name         KaHack!
// @version      1.0.34
// @description  A hack for kahoot.it! First tries proxy lookup by Quiz ID. If that fails, uses fallback search and displays a scrollable dropdown for selection.
// @namespace    https://github.com/johnweeky
// @updateURL    https://github.com/johnweeky/KaHack/raw/main/KaHack!.meta.js
// @downloadURL  https://github.com/johnweeky/KaHack/raw/main/KaHack!.user.js
// @author       johnweeky
// @match        https://kahoot.it/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kahoot.it
// @grant        none
// ==/UserScript==
var Version = '1.0.34';

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

// Sanitize input: Trim whitespace; if it starts with "https//" (missing the colon), fix it.
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
handle.textContent = 'KaHack!';
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

// Change header text as requested.
const headerText = document.createElement('h2');
headerText.textContent = 'QUIZ ID/Name';
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
uiElement.appendChild(headerText);

// Input container – set as relative to position the dropdown
const inputContainer = document.createElement('div');
inputContainer.style.display = 'flex';
inputContainer.style.flexDirection = 'column';
inputContainer.style.alignItems = 'center';
inputContainer.style.position = 'relative';  // make relative for absolute dropdown

const inputBox = document.createElement('input');
inputBox.type = 'text';
inputBox.style.color = 'black';
inputBox.placeholder = 'Quiz Id here...';
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

// --- Enter button below the input ---
const enterButton = document.createElement('button');
enterButton.textContent = 'Enter';
enterButton.style.display = 'block';
enterButton.style.marginTop = '0.5vw';
enterButton.style.width = '27.8vw';
enterButton.style.fontSize = '1.15vw';
enterButton.style.cursor = 'pointer';
enterButton.addEventListener('click', handleInputChange);
inputContainer.appendChild(enterButton);

// --- Dropdown for fallback suggestions ---
// Position it so that it appears directly below the Enter button.
const dropdown = document.createElement('div');
dropdown.style.position = 'absolute';
dropdown.style.top = 'calc(100% + 0.5vw)';
dropdown.style.left = '0';
dropdown.style.width = '27.8vw';
dropdown.style.backgroundColor = 'white';
dropdown.style.border = '.1vw solid black';
dropdown.style.borderRadius = '0.5vw';
dropdown.style.zIndex = '10000';
dropdown.style.display = 'none';
dropdown.style.maxHeight = '20vw';      // Allow many options to be scrollable
dropdown.style.overflowY = 'auto';
inputContainer.appendChild(dropdown);

uiElement.appendChild(inputContainer);

const header2 = document.createElement('h2');
header2.textContent = 'POINTS PER QUESTION';
header2.style.display = 'block';
header2.style.margin = '1vw';
header2.style.textAlign = 'center';
header2.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
header2.style.fontSize = '2vw';
header2.style.color = 'white';
header2.style.textShadow = `
  -1px -1px 0 rgb(47, 47, 47),
  1px -1px 0 rgb(47, 47, 47),
  -1px 1px 0 rgb(47, 47, 47),
  1px 1px 0 rgb(47, 47, 47)
`;
uiElement.appendChild(header2);

const sliderContainer = document.createElement('div');
sliderContainer.style.width = '80%';
sliderContainer.style.margin = '1vw auto';
sliderContainer.style.display = 'flex';
sliderContainer.style.alignItems = 'center';
sliderContainer.style.justifyContent = 'center';

const pointsLabel = document.createElement('span');
pointsLabel.textContent = 'Points per Question: 950';
pointsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
pointsLabel.style.fontSize = '1.5vw';
pointsLabel.style.margin = '1vw';
pointsLabel.style.marginLeft = '1vw';
pointsLabel.style.marginRight = '1vw';
pointsLabel.style.color = 'white';
sliderContainer.appendChild(pointsLabel);

const pointsSlider = document.createElement('input');
pointsSlider.type = 'range';
pointsSlider.min = '500';
pointsSlider.max = '1000';
pointsSlider.value = '950';
pointsSlider.style.width = '70%';
pointsSlider.style.marginLeft = '1vw';
pointsSlider.style.marginRight = '1vw';
pointsSlider.style.border = 'none';
pointsSlider.style.outline = 'none';
pointsSlider.style.cursor = 'ew-resize';
pointsSlider.className = 'custom-slider';
sliderContainer.appendChild(pointsSlider);

uiElement.appendChild(sliderContainer);

pointsSlider.addEventListener('input', () => {
    const points = +pointsSlider.value;
    PPT = points;
    pointsLabel.textContent = 'Points per Question: ' + points;
});

const header3 = document.createElement('h2');
header3.textContent = 'ANSWERING';
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
uiElement.appendChild(header3);

const autoAnswerSwitchContainer = document.createElement('div');
autoAnswerSwitchContainer.className = 'switch-container';
autoAnswerSwitchContainer.style.display = 'flex';
autoAnswerSwitchContainer.style.alignItems = 'center';
autoAnswerSwitchContainer.style.justifyContent = 'center';
uiElement.appendChild(autoAnswerSwitchContainer);

const autoAnswerLabel = document.createElement('span');
autoAnswerLabel.textContent = 'Auto Answer';
autoAnswerLabel.className = 'switch-label';
autoAnswerLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
autoAnswerLabel.style.fontSize = '1.5vw';
autoAnswerLabel.style.color = 'white';
autoAnswerLabel.style.margin = '2.5vw';
autoAnswerSwitchContainer.appendChild(autoAnswerLabel);

const autoAnswerSwitch = document.createElement('label');
autoAnswerSwitch.className = 'switch';
autoAnswerSwitchContainer.appendChild(autoAnswerSwitch);

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

const showAnswersSwitchContainer = document.createElement('div');
showAnswersSwitchContainer.className = 'switch-container';
showAnswersSwitchContainer.style.display = 'flex';
showAnswersSwitchContainer.style.alignItems = 'center';
showAnswersSwitchContainer.style.justifyContent = 'center';
uiElement.appendChild(showAnswersSwitchContainer);

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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
`;
document.head.appendChild(style);

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
uiElement.appendChild(header4);

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
uiElement.appendChild(questionsLabel);

const inputLagLabel = document.createElement('span');
inputLagLabel.textContent = 'Input lag : 125 ms';
inputLagLabel.style.display = 'block';
inputLagLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
inputLagLabel.style.fontSize = '1.5vw';
inputLagLabel.style.textAlign = 'center';
inputLagLabel.style.margin = '1vw';
inputLagLabel.style.marginLeft = '1vw';
inputLagLabel.style.marginRight = '1vw';
inputLagLabel.style.color = 'white';
uiElement.appendChild(inputLagLabel);

const versionLabel = document.createElement('h1');
versionLabel.textContent = 'KaHack! V' + Version;
versionLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
versionLabel.style.fontSize = '2.5vw';
versionLabel.style.display = 'block';
versionLabel.style.textAlign = 'center';
versionLabel.style.marginTop = '3.5vw';
versionLabel.style.marginLeft = '1vw';
versionLabel.style.marginRight = '1vw';
versionLabel.style.color = 'white';
uiElement.appendChild(versionLabel);

const githubContainer = document.createElement('div');
githubContainer.style.textAlign = 'center';
githubContainer.style.marginTop = '1vw';

const githubLabel = document.createElement('span');
githubLabel.textContent = 'GitHub: ';
githubLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
githubLabel.style.fontSize = '1.5vw';
githubLabel.style.margin = '0 1vw';
githubLabel.style.color = 'white';
githubContainer.appendChild(githubLabel);

const githubUrl = document.createElement('a');
githubUrl.textContent = 'John Wee';
githubUrl.href = 'https://johnwee.co';
githubUrl.target = '_blank';
githubUrl.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
githubUrl.style.fontSize = '1.5vw';
githubUrl.style.margin = '0 1vw';
githubUrl.style.color = 'white';
githubContainer.appendChild(githubUrl);

const githubUrl2 = document.createElement('a');
githubUrl2.textContent = 'johnweeky';
githubUrl2.href = 'https://github.com/johnweeky';
githubUrl2.target = '_blank';
githubUrl2.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
githubUrl2.style.fontSize = '1.5vw';
githubUrl2.style.margin = '0 1vw';
githubUrl2.style.color = 'white';
githubContainer.appendChild(githubUrl2);

uiElement.appendChild(githubContainer);

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
        handle.style.height = '2.5vw';
        uiElement.style.height = 'auto';
        closeButton.style.height = '2.5vw';
        minimizeButton.style.height = '2.5vw';
        sliderContainer.style.display = 'flex';
        autoAnswerSwitchContainer.style.display = 'flex';
        showAnswersSwitchContainer.style.display = 'flex';
    }
});

let isDragging = false;
let offsetX, offsetY;
handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - uiElement.getBoundingClientRect().left;
    offsetY = e.clientY - uiElement.getBoundingClientRect().top;
});
document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        uiElement.style.left = x + 'px';
        uiElement.style.top = y + 'px';
    }
});
document.addEventListener('mouseup', () => {
    isDragging = false;
});

// --- Fallback Dropdown Search ---
// If the direct lookup fails, search using the fallback endpoint:
//   https://damp-leaf-16aa.johnwee.workers.dev/rest/kahoots/?query=SEARCHTERM
function searchPublicUUID(searchTerm) {
    const searchUrl = 'https://damp-leaf-16aa.johnwee.workers.dev/rest/kahoots/?query=' + encodeURIComponent(searchTerm);
    console.log("Fallback search URL:", searchUrl);
    fetch(searchUrl)
      .then(response => response.json())
      .then(data => {
          console.log("Fallback search data:", data);
          // Expected structure: data.entities is an array of objects, each with a "card" property.
          let results = (data.entities && data.entities.length > 0) ? data.entities : [];
          dropdown.innerHTML = "";
          if (Array.isArray(results) && results.length > 0) {
              results.slice(0, 5).forEach(entity => {
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
                  
                  item.appendChild(img);
                  item.appendChild(text);
                  
                  // On click, set the input to the chosen UUID and retry direct lookup.
                  item.addEventListener('click', function() {
                      console.log("Selected entity:", card);
                      inputBox.value = quizUUID;
                      dropdown.style.display = 'none';
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
          console.error("Fallback search error:", err);
          dropdown.style.display = 'none';
      });
}

// --- Lookup Function ---
// Triggered only by clicking the Enter button.
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

// Lookup is triggered only by clicking the Enter button.
document.body.appendChild(uiElement);

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
    console.log("onQuestionStart, inputLag =", inputLag);
    var question = questions[info.questionNum];
    if (showAnswers){
        highlightAnswers(question);
    }
    if (autoAnswer){
        answer(question, (question.time - question.time / (500/(PPT-500))) - inputLag);
    }
}

function highlightAnswers(question){
    question.answers.forEach(function (answer) {
        setTimeout(function() {
            FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button").style.backgroundColor = 'rgb(0, 255, 0)';
        }, 0);
    });
    question.incorrectAnswers.forEach(function (answer) {
        setTimeout(function() {
            FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button").style.backgroundColor = 'rgb(255, 0, 0)';
        }, 0);
    });
}

function answer(question, time) {
    Answered_PPT = PPT;
    var delay = (question.type == 'multiple_select_quiz') ? 60 : 0;
    setTimeout(function() {
        if (question.type == 'quiz') {
            const key = (+question.answers[0] + 1).toString();
            const event = new KeyboardEvent('keydown', { key: key });
            window.dispatchEvent(event);
        }
        if (question.type == 'multiple_select_quiz') {
            question.answers.forEach(function(answer) {
                setTimeout(function() {
                    const key = (+answer + 1).toString();
                    const event = new KeyboardEvent('keydown', { key: key });
                    window.dispatchEvent(event);
                }, 0);
            });
            setTimeout(function() {
                FindByAttributeValue("data-functional-selector", 'multi-select-submit-button', "button").click();
            }, 0);
        }
    }, time - delay);
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

setInterval(function () {
    var textElement = FindByAttributeValue("data-functional-selector", "question-index-counter", "div");
    if (textElement){
        info.questionNum = +textElement.textContent - 1;
    }
    if (FindByAttributeValue("data-functional-selector", 'answer-0', "button") && info.lastAnsweredQuestion != info.questionNum) {
        info.lastAnsweredQuestion = info.questionNum;
        onQuestionStart();
    }
    if (autoAnswer){
        if (info.ILSetQuestion != info.questionNum){
            var ppt = Answered_PPT;
            if (ppt > 987) ppt = 1000;
            var incrementElement = FindByAttributeValue("data-functional-selector", "score-increment", "span");
            if (incrementElement){
                info.ILSetQuestion = info.questionNum;
                var increment = +incrementElement.textContent.split(" ")[1];
                if (increment != 0){
                    inputLag += (ppt - increment) * 15;
                    if (inputLag < 0) {
                        inputLag -= (ppt - increment) * 15;
                        inputLag += (ppt - increment/2) * 15;
                    }
                    inputLag = Math.round(inputLag);
                }
            }
        }
    }
    questionsLabel.textContent = 'Question ' + (info.questionNum + 1) + ' / ' + info.numQuestions;
    inputLagLabel.textContent = 'Input lag : ' + inputLag + ' ms';
}, 1);
