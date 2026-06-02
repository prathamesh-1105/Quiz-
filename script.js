// Quiz data is grouped as Subject -> Experiment -> Questions.
const DATABASE_URL = "https://kvdb.io/TbCHjPP3ec2ejka5WYaXud/quizSubjects";

let quizData = {
  subjects: []
};

function updateSyncStatus(status) {
  const syncIndicator = document.getElementById("syncIndicator");
  const syncText = document.getElementById("syncText");
  if (!syncIndicator || !syncText) return;

  syncIndicator.className = "sync-indicator " + status;
  if (status === "synced") {
    syncText.textContent = "Cloud Synced";
  } else if (status === "syncing") {
    syncText.textContent = "Syncing...";
  } else if (status === "offline") {
    syncText.textContent = "Offline Mode";
  } else if (status === "error") {
    syncText.textContent = "Sync Error";
  }
}

let draftQuestions = [];
let activeSubjectIndex = null;
let activeExperimentIndex = null;
let activeQuiz = null;

let expandedSubjects = new Set();
let expandedExperiments = new Set();

const subjectNameInput = document.getElementById("subjectName");
const experimentNameInput = document.getElementById("experimentName");
const questionTextInput = document.getElementById("questionText");
const optionInputs = [
  document.getElementById("option1"),
  document.getElementById("option2"),
  document.getElementById("option3"),
  document.getElementById("option4")
];
const correctAnswerSelect = document.getElementById("correctAnswer");
const questionList = document.getElementById("questionList");
const savedQuizList = document.getElementById("savedQuizList");
const studentNameInput = document.getElementById("studentName");
const subjectList = document.getElementById("subjectList");
const experimentList = document.getElementById("experimentList");
const quizForm = document.getElementById("quizForm");
const studentQuizTitle = document.getElementById("studentQuizTitle");
const quizQuestions = document.getElementById("quizQuestions");
const resultSection = document.getElementById("resultSection");
const studentResultName = document.getElementById("studentResultName");
const scoreText = document.getElementById("scoreText");
const percentageText = document.getElementById("percentageText");
const correctAnswersList = document.getElementById("correctAnswersList");
const adminSection = document.getElementById("adminSection");
const studentSection = document.getElementById("studentSection");
const studentViewBtn = document.getElementById("studentViewBtn");

// Tab and Bulk Elements
const tabSingleBtn = document.getElementById("tabSingleBtn");
const tabBulkBtn = document.getElementById("tabBulkBtn");
const parseBulkBtn = document.getElementById("parseBulkBtn");
const singleQuestionMode = document.getElementById("singleQuestionMode");
const bulkQuestionMode = document.getElementById("bulkQuestionMode");
const bulkPastedText = document.getElementById("bulkPastedText");

studentViewBtn.addEventListener("click", showStudentView);
document.getElementById("addQuestionBtn").addEventListener("click", addQuestion);
document.getElementById("saveQuizBtn").addEventListener("click", saveQuiz);
document.getElementById("showSubjectsBtn").addEventListener("click", showSubjects);
quizForm.addEventListener("submit", submitQuiz);
document.addEventListener("keydown", handleAdminShortcut);

// Tab and Bulk Event Listeners
tabSingleBtn.addEventListener("click", function() {
  tabSingleBtn.classList.add("active");
  tabBulkBtn.classList.remove("active");
  singleQuestionMode.classList.remove("hidden");
  bulkQuestionMode.classList.add("hidden");
});

tabBulkBtn.addEventListener("click", function() {
  tabBulkBtn.classList.add("active");
  tabSingleBtn.classList.remove("active");
  bulkQuestionMode.classList.remove("hidden");
  singleQuestionMode.classList.add("hidden");
});

parseBulkBtn.addEventListener("click", parseAndAddBulkQuestions);

loadQuizData();
showStudentView();

async function showAdminView() {
  adminSection.classList.remove("hidden");
  studentSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  savedQuizList.innerHTML = "<p class='empty-message'>Loading latest cloud data...</p>";
  await loadQuizData();
  displaySavedQuizList();
}

function showStudentView() {
  studentSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
  resetStudentSelection();
}

function handleAdminShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    showAdminView();
  }
}

function addQuestion() {
  const questionText = questionTextInput.value.trim();
  const options = optionInputs.map(function(input) {
    return input.value.trim();
  });
  const correctAnswer = correctAnswerSelect.value;

  if (!questionText || options.includes("") || correctAnswer === "") {
    alert("Please fill the question, all 4 options, and select the correct answer.");
    return;
  }

  draftQuestions.push({
    question: questionText,
    options: options,
    correctAnswer: Number(correctAnswer)
  });

  clearQuestionFields();
  displayQuestionList();
}

function parseAndAddBulkQuestions() {
  const text = bulkPastedText.value.trim();
  if (!text) {
    alert("Please paste some questions from ChatGPT first.");
    return;
  }

  const parsed = parseBulkQuestions(text);
  if (parsed.length === 0) {
    alert("Could not parse any questions. Please check the format and try again.");
    return;
  }

  draftQuestions = draftQuestions.concat(parsed);
  displayQuestionList();
  bulkPastedText.value = "";
  alert("Successfully parsed and added " + parsed.length + " questions to your drafts list!");
}

function parseBulkQuestions(text) {
  const lines = text.split('\n');
  const parsedQuestions = [];
  let currentQuestion = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const optionMatch = line.match(/^([a-d1-4]|\-|\*|•)[\.\)\-\:\s]+(.*)/i);
    const answerMatch = line.match(/^(?:correct\s*answer|answer|correct\s*option|ans|correct)[\s\:\-]+(.*)/i);
    const questionMatch = line.match(/^(?:q|question)?\s*\d+[\.\):\-\s]+(.*)/i);

    if (answerMatch) {
      if (currentQuestion) {
        const ansVal = answerMatch[1].trim().toLowerCase();
        let correctIndex = -1;
        
        if (ansVal.length === 1) {
          if (ansVal === 'a' || ansVal === '1') correctIndex = 0;
          else if (ansVal === 'b' || ansVal === '2') correctIndex = 1;
          else if (ansVal === 'c' || ansVal === '3') correctIndex = 2;
          else if (ansVal === 'd' || ansVal === '4') correctIndex = 3;
        }

        if (correctIndex === -1 && currentQuestion.options.length > 0) {
          const matchIndex = currentQuestion.options.findIndex(opt => opt.toLowerCase() === ansVal);
          if (matchIndex !== -1) {
            correctIndex = matchIndex;
          } else {
            const partialMatchIndex = currentQuestion.options.findIndex(opt => 
              opt.toLowerCase().includes(ansVal) || ansVal.includes(opt.toLowerCase())
            );
            if (partialMatchIndex !== -1) {
              correctIndex = partialMatchIndex;
            }
          }
        }

        if (correctIndex !== -1) {
          currentQuestion.correctAnswer = correctIndex;
        } else {
          currentQuestion.correctAnswer = 0; 
        }
      }
    } else if (optionMatch && !questionMatch) {
      if (currentQuestion) {
        currentQuestion.options.push(optionMatch[2].trim());
      }
    } else {
      let qText = line;
      if (questionMatch) {
        qText = questionMatch[1].trim();
      }

      if (currentQuestion) {
        if (currentQuestion.options.length > 0) {
          while (currentQuestion.options.length < 4) {
            currentQuestion.options.push(`Option ${currentQuestion.options.length + 1}`);
          }
          if (currentQuestion.options.length > 4) {
            currentQuestion.options = currentQuestion.options.slice(0, 4);
          }
          parsedQuestions.push(currentQuestion);
        }
      }

      currentQuestion = {
        question: qText,
        options: [],
        correctAnswer: 0
      };
    }
  }

  if (currentQuestion && currentQuestion.options.length > 0) {
    while (currentQuestion.options.length < 4) {
      currentQuestion.options.push(`Option ${currentQuestion.options.length + 1}`);
    }
    if (currentQuestion.options.length > 4) {
      currentQuestion.options = currentQuestion.options.slice(0, 4);
    }
    parsedQuestions.push(currentQuestion);
  }

  return parsedQuestions;
}

function saveQuiz() {
  const subjectName = subjectNameInput.value.trim();
  const experimentName = experimentNameInput.value.trim();

  if (!subjectName) {
    alert("Please add a subject name.");
    return;
  }

  if (!experimentName) {
    alert("Please add an experiment name.");
    return;
  }

  if (draftQuestions.length === 0) {
    alert("Please add at least one question.");
    return;
  }

  const subject = findOrCreateSubject(subjectName);
  const existingExperimentIndex = subject.experiments.findIndex(function(experiment) {
    return experiment.name.toLowerCase() === experimentName.toLowerCase();
  });

  const experiment = {
    name: experimentName,
    questions: draftQuestions
  };

  if (existingExperimentIndex >= 0) {
    subject.experiments[existingExperimentIndex] = experiment;
  } else {
    subject.experiments.push(experiment);
  }

  saveQuizData();
  alert("Experiment quiz saved successfully.");
  clearAdminDraft();
  displaySavedQuizList();
  showStudentView();
}

async function loadQuizData() {
  updateSyncStatus("syncing");
  try {
    const response = await fetch(DATABASE_URL);
    if (response.ok) {
      const text = await response.text();
      if (text && text.trim() !== "") {
        quizData = JSON.parse(text);
        localStorage.setItem("quizSubjects", text);
        updateSyncStatus("synced");
        return;
      }
    } else if (response.status === 404) {
      // Key not found in cloud database yet, load whatever is in localStorage
      loadLocalData();
      // Push it to the cloud so cloud and local are synced
      await saveQuizDataCloudOnly();
      updateSyncStatus("synced");
      return;
    }
    throw new Error("HTTP error status " + response.status);
  } catch (error) {
    console.error("Cloud load failed, falling back to local cache:", error);
    loadLocalData();
    updateSyncStatus("offline");
  }
}

function loadLocalData() {
  const savedData = localStorage.getItem("quizSubjects");
  const oldQuiz = localStorage.getItem("simpleQuiz");

  if (savedData) {
    quizData = JSON.parse(savedData);
    return;
  }

  if (oldQuiz) {
    const parsedQuiz = JSON.parse(oldQuiz);

    if (parsedQuiz.questions && parsedQuiz.questions.length > 0) {
      quizData = {
        subjects: [
          {
            name: parsedQuiz.title || "General",
            experiments: [
              {
                name: parsedQuiz.title || "Saved Quiz",
                questions: parsedQuiz.questions
              }
            ]
          }
        ]
      };
      localStorage.setItem("quizSubjects", JSON.stringify(quizData));
    }
  }
}

function saveQuizData() {
  const stringified = JSON.stringify(quizData);
  localStorage.setItem("quizSubjects", stringified);
  saveQuizDataCloudOnly(stringified);
}

async function saveQuizDataCloudOnly(stringifiedData) {
  const data = stringifiedData || JSON.stringify(quizData);
  updateSyncStatus("syncing");
  try {
    const response = await fetch(DATABASE_URL, {
      method: "POST",
      body: data
    });
    if (response.ok) {
      updateSyncStatus("synced");
    } else {
      throw new Error("HTTP status " + response.status);
    }
  } catch (error) {
    console.error("Cloud sync failed:", error);
    updateSyncStatus("error");
  }
}

function findOrCreateSubject(subjectName) {
  const existingSubject = quizData.subjects.find(function(subject) {
    return subject.name.toLowerCase() === subjectName.toLowerCase();
  });

  if (existingSubject) {
    return existingSubject;
  }

  const subject = {
    name: subjectName,
    experiments: []
  };

  quizData.subjects.push(subject);
  return subject;
}

function displayQuestionList() {
  questionList.innerHTML = "";

  draftQuestions.forEach(function(item, index) {
    const listItem = document.createElement("li");
    listItem.className = "question-list-item";

    const questionText = document.createElement("span");
    questionText.textContent = item.question + " (Correct: " + item.options[item.correctAnswer] + ")";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function() {
      deleteQuestion(index);
    });

    listItem.appendChild(questionText);
    listItem.appendChild(deleteButton);
    questionList.appendChild(listItem);
  });
}

function displaySavedQuizList() {
  savedQuizList.innerHTML = "";

  if (quizData.subjects.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No saved subjects yet.";
    savedQuizList.appendChild(emptyMessage);
    return;
  }

  quizData.subjects.forEach(function(subject, subjectIndex) {
    const subjectItem = document.createElement("div");
    subjectItem.className = "collapsible-item";
    if (expandedSubjects.has(subjectIndex)) {
      subjectItem.className += " open";
    }

    const subjectHeader = document.createElement("div");
    subjectHeader.className = "collapsible-header";
    
    const subjectTitle = document.createElement("div");
    subjectTitle.className = "collapsible-header-title subject-title";
    subjectTitle.innerHTML = "<span class='collapsible-icon'>▶</span> 📂 <strong>" + subject.name + "</strong>";

    const subjectActions = document.createElement("div");
    subjectActions.className = "collapsible-actions";

    const subjectDeleteBtn = document.createElement("button");
    subjectDeleteBtn.type = "button";
    subjectDeleteBtn.className = "delete-button";
    subjectDeleteBtn.textContent = "Delete Subject";
    subjectDeleteBtn.addEventListener("click", function(event) {
      event.stopPropagation(); // Avoid toggling expansion when clicking delete
      deleteSubject(subjectIndex);
    });

    subjectActions.appendChild(subjectDeleteBtn);
    subjectHeader.appendChild(subjectTitle);
    subjectHeader.appendChild(subjectActions);
    subjectItem.appendChild(subjectHeader);

    // Accordion toggle click listener
    subjectHeader.addEventListener("click", function() {
      if (expandedSubjects.has(subjectIndex)) {
        expandedSubjects.delete(subjectIndex);
        subjectItem.classList.remove("open");
      } else {
        expandedSubjects.add(subjectIndex);
        subjectItem.classList.add("open");
      }
    });

    const subjectBody = document.createElement("div");
    subjectBody.className = "collapsible-body";

    if (!subject.experiments || subject.experiments.length === 0) {
      const emptyExperimentMessage = document.createElement("p");
      emptyExperimentMessage.className = "empty-message";
      emptyExperimentMessage.textContent = "No experiments saved in this subject.";
      subjectBody.appendChild(emptyExperimentMessage);
    } else {
      subject.experiments.forEach(function(experiment, experimentIndex) {
        const expKey = subjectIndex + "-" + experimentIndex;
        const experimentItem = document.createElement("div");
        experimentItem.className = "collapsible-item";
        if (expandedExperiments.has(expKey)) {
          experimentItem.className += " open";
        }

        const experimentHeader = document.createElement("div");
        experimentHeader.className = "collapsible-header";

        const experimentTitle = document.createElement("div");
        experimentTitle.className = "collapsible-header-title experiment-title";
        experimentTitle.innerHTML = "<span class='collapsible-icon'>▶</span> 📝 " + experiment.name;

        const experimentActions = document.createElement("div");
        experimentActions.className = "collapsible-actions";

        const experimentDeleteBtn = document.createElement("button");
        experimentDeleteBtn.type = "button";
        experimentDeleteBtn.className = "delete-button";
        experimentDeleteBtn.textContent = "Delete Experiment";
        experimentDeleteBtn.addEventListener("click", function(event) {
          event.stopPropagation(); // Avoid toggling expansion
          deleteExperiment(subjectIndex, experimentIndex);
        });

        experimentActions.appendChild(experimentDeleteBtn);
        experimentHeader.appendChild(experimentTitle);
        experimentHeader.appendChild(experimentActions);
        experimentItem.appendChild(experimentHeader);

        experimentHeader.addEventListener("click", function() {
          if (expandedExperiments.has(expKey)) {
            expandedExperiments.delete(expKey);
            experimentItem.classList.remove("open");
          } else {
            expandedExperiments.add(expKey);
            experimentItem.classList.add("open");
          }
        });

        const experimentBody = document.createElement("div");
        experimentBody.className = "collapsible-body";

        if (!experiment.questions || experiment.questions.length === 0) {
          const emptyQuestionMessage = document.createElement("p");
          emptyQuestionMessage.className = "empty-message";
          emptyQuestionMessage.textContent = "No questions saved in this experiment.";
          experimentBody.appendChild(emptyQuestionMessage);
        } else {
          const savedQuestionList = document.createElement("ol");

          experiment.questions.forEach(function(question, questionIndex) {
            const questionItem = document.createElement("li");
            questionItem.className = "question-list-item";

            const questionText = document.createElement("span");
            questionText.textContent = question.question;

            const questionDeleteButton = document.createElement("button");
            questionDeleteButton.type = "button";
            questionDeleteButton.className = "delete-button";
            questionDeleteButton.textContent = "Delete";
            questionDeleteButton.addEventListener("click", function(event) {
              event.stopPropagation();
              deleteSavedQuestion(subjectIndex, experimentIndex, questionIndex);
            });

            questionItem.appendChild(questionText);
            questionItem.appendChild(questionDeleteButton);
            savedQuestionList.appendChild(questionItem);
          });

          experimentBody.appendChild(savedQuestionList);
        }

        experimentItem.appendChild(experimentBody);
        subjectBody.appendChild(experimentItem);
      });
    }

    subjectItem.appendChild(subjectBody);
    savedQuizList.appendChild(subjectItem);
  });
}

function deleteQuestion(index) {
  draftQuestions.splice(index, 1);
  displayQuestionList();
}

function deleteSubject(subjectIndex) {
  const subjectName = quizData.subjects[subjectIndex].name;

  if (!confirm("Delete the subject \"" + subjectName + "\" and all its experiments?")) {
    return;
  }

  quizData.subjects.splice(subjectIndex, 1);
  saveQuizData();
  displaySavedQuizList();
  resetStudentSelection();
}

function deleteExperiment(subjectIndex, experimentIndex) {
  const experimentName = quizData.subjects[subjectIndex].experiments[experimentIndex].name;

  if (!confirm("Delete the experiment \"" + experimentName + "\" and all its questions?")) {
    return;
  }

  quizData.subjects[subjectIndex].experiments.splice(experimentIndex, 1);
  saveQuizData();
  displaySavedQuizList();
  resetStudentSelection();
}

function deleteSavedQuestion(subjectIndex, experimentIndex, questionIndex) {
  const questionText = quizData.subjects[subjectIndex].experiments[experimentIndex].questions[questionIndex].question;

  if (!confirm("Delete this question?\n\n" + questionText)) {
    return;
  }

  quizData.subjects[subjectIndex].experiments[experimentIndex].questions.splice(questionIndex, 1);
  saveQuizData();
  displaySavedQuizList();
  resetStudentSelection();
}

function clearQuestionFields() {
  questionTextInput.value = "";
  optionInputs.forEach(function(input) {
    input.value = "";
  });
  correctAnswerSelect.value = "";
}

function clearAdminDraft() {
  subjectNameInput.value = "";
  experimentNameInput.value = "";
  draftQuestions = [];
  if (bulkPastedText) {
    bulkPastedText.value = "";
  }
  clearQuestionFields();
  displayQuestionList();
}

function resetStudentSelection() {
  activeSubjectIndex = null;
  activeExperimentIndex = null;
  activeQuiz = null;
  subjectList.classList.add("hidden");
  experimentList.classList.add("hidden");
  quizForm.classList.add("hidden");
  resultSection.classList.add("hidden");
  subjectList.innerHTML = "";
  experimentList.innerHTML = "";
  studentQuizTitle.textContent = "";
  quizQuestions.innerHTML = "";
  correctAnswersList.innerHTML = "";
}

function requireStudentName() {
  if (!studentNameInput.value.trim()) {
    alert("Please enter your name.");
    return false;
  }

  return true;
}

async function showSubjects() {
  if (!requireStudentName()) {
    return;
  }

  await loadQuizData();
  resetQuizOnly();
  subjectList.innerHTML = "";
  experimentList.innerHTML = "";
  experimentList.classList.add("hidden");

  if (quizData.subjects.length === 0) {
    alert("No subjects found. Please create and save a quiz first.");
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = "Choose Subject";
  subjectList.appendChild(heading);

  quizData.subjects.forEach(function(subject, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = subject.name;
    button.addEventListener("click", function() {
      showExperiments(index);
    });

    subjectList.appendChild(button);
  });

  subjectList.classList.remove("hidden");
}

function showExperiments(subjectIndex) {
  activeSubjectIndex = subjectIndex;
  activeExperimentIndex = null;
  activeQuiz = null;
  resetQuizOnly();
  experimentList.innerHTML = "";

  const subject = quizData.subjects[subjectIndex];

  const heading = document.createElement("h3");
  heading.textContent = subject.name + " Experiments";
  experimentList.appendChild(heading);

  if (!subject.experiments || subject.experiments.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No experiments found for this subject yet.";
    experimentList.appendChild(emptyMessage);
    experimentList.classList.remove("hidden");
    return;
  }

  subject.experiments.forEach(function(experiment, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = experiment.name;
    button.addEventListener("click", function() {
      startQuiz(index);
    });

    experimentList.appendChild(button);
  });

  experimentList.classList.remove("hidden");
}

function resetQuizOnly() {
  quizForm.classList.add("hidden");
  resultSection.classList.add("hidden");
  studentQuizTitle.textContent = "";
  quizQuestions.innerHTML = "";
  correctAnswersList.innerHTML = "";
}

function startQuiz(experimentIndex) {
  if (!requireStudentName()) {
    return;
  }

  activeExperimentIndex = experimentIndex;
  activeQuiz = quizData.subjects[activeSubjectIndex].experiments[activeExperimentIndex];

  if (!activeQuiz.questions || activeQuiz.questions.length === 0) {
    alert("No questions found in this experiment.");
    return;
  }

  studentQuizTitle.textContent = quizData.subjects[activeSubjectIndex].name + " - " + activeQuiz.name;
  quizQuestions.innerHTML = "";
  resultSection.classList.add("hidden");

  activeQuiz.questions.forEach(function(item, questionIndex) {
    const questionBox = document.createElement("div");
    questionBox.className = "quiz-question";

    const questionTitle = document.createElement("p");
    questionTitle.textContent = questionIndex + 1 + ". " + item.question;
    questionBox.appendChild(questionTitle);

    item.options.forEach(function(option, optionIndex) {
      const optionLabel = document.createElement("label");
      optionLabel.className = "radio-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "question" + questionIndex;
      radio.value = optionIndex;

      optionLabel.appendChild(radio);
      optionLabel.appendChild(document.createTextNode(option));
      questionBox.appendChild(optionLabel);
    });

    quizQuestions.appendChild(questionBox);
  });

  quizForm.classList.remove("hidden");
}

function submitQuiz(event) {
  event.preventDefault();

  if (!activeQuiz) {
    alert("Please choose an experiment first.");
    return;
  }

  let score = 0;
  correctAnswersList.innerHTML = "";

  activeQuiz.questions.forEach(function(item, questionIndex) {
    const selectedOption = document.querySelector("input[name='question" + questionIndex + "']:checked");

    if (selectedOption && Number(selectedOption.value) === item.correctAnswer) {
      score++;
    }

    const answerItem = document.createElement("li");
    answerItem.textContent = item.question + " - " + item.options[item.correctAnswer];
    correctAnswersList.appendChild(answerItem);
  });

  const percentage = Math.round((score / activeQuiz.questions.length) * 100);

  studentResultName.textContent = "Student: " + studentNameInput.value.trim();
  scoreText.textContent = score + " out of " + activeQuiz.questions.length;
  percentageText.textContent = percentage + "%";
  resultSection.classList.remove("hidden");
}