// Quiz data is grouped as Subject -> Experiment -> Questions.
let quizData = {
  subjects: []
};

let draftQuestions = [];
let activeSubjectIndex = null;
let activeExperimentIndex = null;
let activeQuiz = null;

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

studentViewBtn.addEventListener("click", showStudentView);
document.getElementById("addQuestionBtn").addEventListener("click", addQuestion);
document.getElementById("saveQuizBtn").addEventListener("click", saveQuiz);
document.getElementById("showSubjectsBtn").addEventListener("click", showSubjects);
quizForm.addEventListener("submit", submitQuiz);
document.addEventListener("keydown", handleAdminShortcut);

loadQuizData();
showStudentView();

function showAdminView() {
  adminSection.classList.remove("hidden");
  studentSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  loadQuizData();
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

function loadQuizData() {
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
      saveQuizData();
    }
  }
}

function saveQuizData() {
  localStorage.setItem("quizSubjects", JSON.stringify(quizData));
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
    const subjectBox = document.createElement("div");
    subjectBox.className = "manage-subject";

    const subjectHeader = document.createElement("div");
    subjectHeader.className = "manage-header";

    const subjectTitle = document.createElement("strong");
    subjectTitle.textContent = subject.name;

    const subjectDeleteButton = document.createElement("button");
    subjectDeleteButton.type = "button";
    subjectDeleteButton.className = "delete-button";
    subjectDeleteButton.textContent = "Delete Subject";
    subjectDeleteButton.addEventListener("click", function() {
      deleteSubject(subjectIndex);
    });

    subjectHeader.appendChild(subjectTitle);
    subjectHeader.appendChild(subjectDeleteButton);
    subjectBox.appendChild(subjectHeader);

    if (!subject.experiments || subject.experiments.length === 0) {
      const emptyExperimentMessage = document.createElement("p");
      emptyExperimentMessage.className = "empty-message";
      emptyExperimentMessage.textContent = "No experiments saved in this subject.";
      subjectBox.appendChild(emptyExperimentMessage);
    } else {
      subject.experiments.forEach(function(experiment, experimentIndex) {
        const experimentBox = document.createElement("div");
        experimentBox.className = "manage-experiment";

        const experimentHeader = document.createElement("div");
        experimentHeader.className = "manage-header";

        const experimentTitle = document.createElement("span");
        experimentTitle.textContent = experiment.name;

        const experimentDeleteButton = document.createElement("button");
        experimentDeleteButton.type = "button";
        experimentDeleteButton.className = "delete-button";
        experimentDeleteButton.textContent = "Delete Experiment";
        experimentDeleteButton.addEventListener("click", function() {
          deleteExperiment(subjectIndex, experimentIndex);
        });

        experimentHeader.appendChild(experimentTitle);
        experimentHeader.appendChild(experimentDeleteButton);
        experimentBox.appendChild(experimentHeader);

        if (!experiment.questions || experiment.questions.length === 0) {
          const emptyQuestionMessage = document.createElement("p");
          emptyQuestionMessage.className = "empty-message";
          emptyQuestionMessage.textContent = "No questions saved in this experiment.";
          experimentBox.appendChild(emptyQuestionMessage);
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
            questionDeleteButton.addEventListener("click", function() {
              deleteSavedQuestion(subjectIndex, experimentIndex, questionIndex);
            });

            questionItem.appendChild(questionText);
            questionItem.appendChild(questionDeleteButton);
            savedQuestionList.appendChild(questionItem);
          });

          experimentBox.appendChild(savedQuestionList);
        }

        subjectBox.appendChild(experimentBox);
      });
    }

    savedQuizList.appendChild(subjectBox);
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

function showSubjects() {
  if (!requireStudentName()) {
    return;
  }

  loadQuizData();
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