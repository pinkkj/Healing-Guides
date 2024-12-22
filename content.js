const SERVER_URL = 'http://127.0.0.1:5001';

let warningPerson = false;
let warningVideo = false;
let lastURL = "";

async function sendURLToServer(url) {
  //videoPrevent();
  const data = { "url": url };

  // AbortController로 타임아웃 구현
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃 설정

  try {
      const response = await fetch(`${SERVER_URL}/analyze_video`, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
              'Content-Type': 'application/json'
          },
          signal: controller.signal
      });

      clearTimeout(timeoutId); // 요청이 완료되면 타임아웃 해제

      if (response.ok) {
          const responseData = await response.json();
          console.log("서버 응답:", responseData);

          if (responseData.is_depressive === "yes"){
            warningVideo = true;
            setTimeout(()=> {
              videoPrevent();
            }, 1500);
          } else {
            warningVideo = false;
            setTimeout(()=> {
              videoPrevent();
            }, 1500);
          }
      } else {
          throw new Error(`오류 발생: ${response.status} ${response.statusText}`);
      }
  } catch (error) {
      if (error.name === 'AbortError') {
          console.error("요청 시간이 초과되었습니다.");
      } else {
          console.error("요청 오류:", error);
      }
  }
}

async function checkServerResponse() {
  try {
    const response = await fetch(`${SERVER_URL}/check_warning`, {
      method: 'POST'
    });
    
    const data = await response.json();
    if (data.warning) {
      displayQuestionsOverlay();
      clearInterval(checkInterval);
    } else {
      console.log('No warning. Video can play.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
        console.error("요청 시간이 초과되었습니다.");
    } else {
        console.error("요청 오류:", error);
    }
}
}

async function checkVideoDepressive(url) {
  try {
    const response = await fetch(`${SERVER_URL}/analyze_home`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking video:', error);
    return null;
  }
}

async function CbtTimeKeword() {
  try {
    const response = await fetch(`${SERVER_URL}/get_information`, {
      method: 'POST'
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking video:', error);
    return null;
  }
}

const PhqQuestions = [
  "일 또는 여가 활동을 하는 데 흥미나 즐거움을 느끼지 못한다.", 
  "기분이 가라앉거나, 우울하거나, 희망이 없다.", 
  "잠이 들거나 계속 잠을 자는 것이 어렵다.<br>또는 잠을 너무 많이 잔다.", 
  "피곤하다고 느끼거나 기운이 거의 없다.", 
  "입맛이 없거나 과식을 한다.",
  "자신을 부정적으로 본다.<br>혹은 자신이 실패자라고 느끼거나 자신 또는 가족을 실망시킨다.", 
  "신문을 읽거나 텔레비전 보는 것과 같은 일에 집중하는 것이 어렵다.", 
  "다른 사람들이 주목할 정도로 너무 느리게 움직이거나 말을 한다.<br>또는 반대로 평상시보다 많이 움직여서, 너무 안절부절못하거나 들떠 있다.", 
  "자신이 죽는 것이 더 낫다고 생각하거나 <br>어떤 식으로든 자신을 해칠 것이라고 생각한다."
];
const PhqOptions = ["전혀 방해 받지 않았다", "며칠 동안 방해 받았다", "7일 이상 방해 받았다", "거의 매일 방해 받았다"];
let PhqAnswers = new Array(PhqQuestions.length).fill(null);
let currentPhqQuestionIndex = 0;

// 영상 시청 막는 함수
function preventVideoPlay() {
  const videoElement = document.querySelector('video');
  if (videoElement) {
    videoElement.pause();
    videoElement.controls = false;
    console.log('Video playback prevented');
  }
}

// 진단검사 Overlay
function displayQuestionsOverlay() {
  const videoElement = document.querySelector('video');
  if (videoElement) {
    videoElement.style.position = 'relative';
    preventVideoPlay();
    videoElement.addEventListener('play', preventVideoPlay);

    const overlay = document.createElement('div');
    overlay.id = 'questionOverlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'black';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'auto';


    const questionContainer = document.createElement('div');
    questionContainer.id = 'questionContainer';
    questionContainer.style.position = 'absolute';
    questionContainer.style.top = '50%';
    questionContainer.style.left = '50%';
    questionContainer.style.transform = 'translate(-50%, -50%)';
    questionContainer.style.width = '60%';
    questionContainer.style.backgroundColor ='#f2f2f2';
    questionContainer.style.padding = '20px';
    questionContainer.style.borderRadius = '10px';
    questionContainer.style.zIndex = '10000';
    questionContainer.style.overflow = 'visible';

    overlay.appendChild(questionContainer);
    videoElement.parentElement.style.position = 'relative';
    videoElement.parentElement.appendChild(overlay);

    loadState(() => {
      showIntroMessage()
    });
  }
}

// 안내 문구
function showIntroMessage() {
  const questionContainer = document.getElementById('questionContainer');
  questionContainer.innerHTML = "";

  const instructionText = document.createElement("p");
  instructionText.innerText = "현재 우울을 유발할 수 있는 영상을 30분째 시청 중입니다. \nPHQ 검사를 통해 우울 상태를 점검해볼까요? \n\n지난 2주일 동안 당신은 다음의 문제들로 인해서\n 얼마나 자주 방해를 받았는지 체크해주세요.";
  instructionText.style.fontSize = '14px';
  instructionText.style.fontWeight = '600';
  instructionText.style.textAlign = 'center';
  instructionText.style.marginBottom = '10px';
  instructionText.style.marginTop = '15px';
  instructionText.style.color = '#0F0F0F';
  instructionText.style.fontFamily = 'Roboto, Arial, sans-serif';
  instructionText.style.lineHeight = 1.5;

  const buttonWrapper = document.createElement("div");
  buttonWrapper.style.display = 'flex';
  buttonWrapper.style.justifyContent = 'center';
  buttonWrapper.style.marginTop = '5px';

  const startButton = document.createElement("button");
  startButton.innerText = "시작하기";
  startButton.style.padding = '10px 20px';
  startButton.style.fontSize = '14px';
  startButton.style.backgroundColor = '#0F0F0F';
  startButton.style.color = '#FFFFFF';
  startButton.style.border = 'none';
  startButton.style.borderRadius = '15px';
  startButton.style.cursor = 'pointer';
  startButton.style.marginTop = '5px';
  startButton.onclick = () => displayPhqQuestion(currentPhqQuestionIndex);

  buttonWrapper.appendChild(startButton);
  questionContainer.appendChild(instructionText);
  questionContainer.appendChild(buttonWrapper);
}

// phq 질문
function displayPhqQuestion(index) {
  const questionContainer = document.getElementById('questionContainer');
  questionContainer.innerHTML = "";

  const progressDiv = document.createElement("div");
  progressDiv.className = "progress";
  progressDiv.style.textAlign = "center";
  progressDiv.style.marginBottom = "10px";
  progressDiv.innerHTML = `<p style="color: #131313; font-size: 12.5px; font-family: Roboto, Arial, sans-serif; font-weight: 400; ">질문 ${index + 1} / ${PhqQuestions.length}</p>`;
  questionContainer.appendChild(progressDiv);

  const questionDiv = document.createElement("div");
  questionDiv.className = "question";
  questionDiv.innerHTML = `<p style="color: #0F0F0F; font-size: 14px; font-family: Roboto, Arial, sans-serif; font-weight: 600; line-height: 20px; display: inline-block; width: 100%;">${PhqQuestions[index]}</p>`;
  questionDiv.style.textAlign = "center";

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "options";
  optionsDiv.style.textAlign = "center";
  optionsDiv.style.marginTop = "10px";

  PhqOptions.forEach((option, optIndex) => {
    const optionContainer = document.createElement("div");
    optionContainer.className = "option-row";

    const radioInput = document.createElement("input");
    radioInput.type = "radio";
    radioInput.style.cursor = "pointer";
    radioInput.name = `question${index}`;
    radioInput.value = optIndex;
    radioInput.id = `q${index}_opt${optIndex}`;

    if (PhqAnswers[index] === optIndex) radioInput.checked = true;

    radioInput.onclick = (event) => {
      event.stopPropagation();
      PhqAnswers[index] = parseInt(radioInput.value, 10);
      saveState();
      setTimeout(() => {
        showNextQuestion();
      }, 300);
    };

    const label = document.createElement("label");
    label.htmlFor = `q${index}_opt${optIndex}`;
    label.innerText = option;
    label.innerHTML = option;
    label.style.cursor = "pointer";
    label.style.zIndex = '10001';
    label.style.display = "inline-block";
    label.style.color = "#131313";
    label.style.fontSize = "13px";
    label.style.fontFamily = "Roboto, Arial, sans-serif";
    label.style.fontWeight = "400";

    label.onclick = (event) => {
      event.stopPropagation();
      radioInput.checked = true;
    };

    optionContainer.appendChild(radioInput);
    optionContainer.appendChild(label);
    optionsDiv.appendChild(optionContainer);
  });

  questionDiv.appendChild(optionsDiv);
  questionContainer.appendChild(questionDiv);

  if (index > 0) {
    const prevButton = document.createElement("button");
    prevButton.id = "prevButton";
    prevButton.style.position = 'absolute';
    prevButton.style.top = '10px';
    prevButton.style.left = '10px';
    prevButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    prevButton.style.color = '#0F0F0F';
    prevButton.style.padding = '5px 10px';
    prevButton.style.border = 'none';
    prevButton.style.borderRadius = '5px';
    prevButton.style.cursor = 'pointer';
    prevButton.style.zIndex = '10001';
    prevButton.innerText = "←";
    prevButton.onclick = showPreviousQuestion;
    prevButton.style.overflow = 'visible';
    questionContainer.appendChild(prevButton);
  }

  // x버튼 생성
  const closeButton = document.createElement('button');
  closeButton.innerText = 'X';
  closeButton.style.zIndex = '10001';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
  closeButton.style.color = '#0F0F0F';
  closeButton.style.border = 'none';
  closeButton.style.padding = '5px 10px';
  closeButton.style.borderRadius = '5px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = (event) => {
    event.stopPropagation();
    const overlay = document.getElementById('questionOverlay');
    overlay.remove();
    const videoElement = document.querySelector('video');
    videoElement.controls = true;
    videoElement.play();
    videoElement.removeEventListener('play', preventVideoPlay);
  }
  questionContainer.appendChild(closeButton); 
}

// 자가진단 질문 상태 저장
function saveState() {
  chrome.storage.local.set({ PhqAnswers, currentPhqQuestionIndex });
}
function loadState(callback) {
  chrome.storage.local.get(["PhqAnswers", "currentPhqQuestionIndex"], (result) => {
    if (result.PhqAnswers) PhqAnswers = result.PhqAnswers;
    if (result.currentPhqQuestionIndex !== undefined) currentPhqQuestionIndex = result.currentPhqQuestionIndex;
    callback();
  });
}

// 이전, 다음 질문 가져오기
function showPreviousQuestion() {
  if (currentPhqQuestionIndex > 0) {
    currentPhqQuestionIndex--;
    displayPhqQuestion(currentPhqQuestionIndex);
    saveState();
  }
}
function showNextQuestion() {
  if (currentPhqQuestionIndex < PhqQuestions.length - 1) {
    currentPhqQuestionIndex++;
    displayPhqQuestion(currentPhqQuestionIndex);
    saveState();
  } else {
    console.log("저장된 답변:", PhqAnswers);
    saveState();
    chrome.storage.local.remove(["PhqAnswers", "currentPhqQuestionIndex"]);

    const overlay = document.getElementById('questionOverlay');
    const questionContainer = document.getElementById('questionContainer');
    if (questionContainer) {
      questionContainer.innerHTML = ""; // 오버레이 내용을 비웁니다.
    } else {
      console.error("Question overlay not found!");
      return;
    }

    let PhqSum = PhqAnswers.reduce((total, num) => total + num, 0);
    if(PhqSum > 4 && PhqSum < 20) {
      warningPerson = true;
      const messageDiv = document.createElement('div');
      messageDiv.id = 'messageDiv';
      messageDiv.style.marginTop = '30px';
      messageDiv.style.marginBottom = '10px';
      messageDiv.style.color = 'black';
      messageDiv.style.fontWeight = 'bold';
      messageDiv.style.textAlign = 'center';
      messageDiv.style.lineHeight = '1.5';
      messageDiv.style.fontSize = '18px';

      if (PhqSum >= 5 && PhqSum <= 9) {
        messageDiv.innerText = 'PHQ검사 결과 가벼운 우울증상을 보이고 있습니다. \n우울감을 줄일 수 있는 방법을 알아볼까요?';
      } else if (PhqSum >= 10 && PhqSum <= 19) {
        messageDiv.innerText = 'PHQ검사 결과 중간 정도의 우울증상을 보이고 있습니다. \n우울감을 줄일 수 있는 방법을 알아볼까요?';
      }

      const buttonWrapper = document.createElement("div");
      buttonWrapper.style.display = 'flex';
      buttonWrapper.style.justifyContent = 'center'; // 가운데 정렬
      buttonWrapper.style.width = '100%';

      const startButton = document.createElement('button');
      startButton.innerText = '질문 시작';
      startButton.style.marginTop = '10px';
      startButton.style.padding = '10px';
      startButton.style.borderRadius = '15px';
      startButton.style.backgroundColor = 'rgb(15, 15, 15)';
      startButton.style.color = 'white';
      startButton.style.border = 'none';
      startButton.style.cursor = 'pointer';

      questionContainer.style.display = 'flex';
      questionContainer.style.flexDirection = 'column';
      questionContainer.style.justifyContent = 'center';

      startButton.onclick = () => {
        questionContainer.innerHTML = "";
        currentCbtQuestionIndex = 0; 
        displayCbtQuestion(currentCbtQuestionIndex); 
      };

      questionContainer.appendChild(messageDiv);
      buttonWrapper.appendChild(startButton);
      questionContainer.appendChild(buttonWrapper);

    } else if (PhqSum < 5) {
      alert("PHQ 검사 결과 우울증이 아닙니다!")
    } else {
      alert("PHQ 검사 결과 심한 우울증일 수 있습니다. 전문가와 상담이 필요합니다.")
      location.href='https://www.lifeline.or.kr/index.php';
    }
  }
}

const CbtOptions = ["예", "아니오", "잘 모르겠습니다"];
let CbtAnswers = [];
let currentCbtQuestionIndex = 0;

// 반추 도움 질문 생성
async function displayCbtQuestion(index) {
  const videoData = await CbtTimeKeword();
  const CbtQuestions = [
    `${videoData.start_time}부터 <br>${videoData.most_frequent_keywords}에 관한 생각이 많으신 것 같아요. <br>이러한 생각이 왜 시작되었는지 알 수 있을까요?`,
    `문제 해결에 도움이 되지 않는 생각이 <br>30분 이상 지속된다면 반추일 수 있어요.<br>${videoData.most_frequent_keywords}에 대한 지금까지의 생각들이 <br>문제 해결에 도움이 되었나요?`,
    "이 상황에서 어떤 구체적인 해결책이 있을지 생각해볼까요?",
    "자신에게 친절한 메세지를 써본다면 어떤 말을 해주고 싶나요?"
  ];

  let CbtAnswers = new Array(CbtQuestions.length).fill(null);
  const questionsContainer = document.getElementById('questionContainer');
  questionsContainer.innerHTML = ""; 
  
  const questionWrapper = document.createElement("div");
  questionWrapper.style.display = 'flex';
  questionWrapper.style.justifyContent = 'center'; 
  questionWrapper.style.width = '100%';

  const questionDiv = document.createElement("div");
  questionDiv.classList.add("question-style");

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "options";
  optionsDiv.style.display = 'flex'; 
  optionsDiv.style.flexDirection = 'column'; 
  optionsDiv.style.alignItems = 'center'; 
  optionsDiv.style.gap = '10px'; 

  const closeButton = document.createElement('button');
  closeButton.innerText = 'X';
  closeButton.style.zIndex = '10001';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
  closeButton.style.color = '#0F0F0F';
  closeButton.style.border = 'none';
  closeButton.style.padding = '5px 10px';
  closeButton.style.borderRadius = '5px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = (event) => {
    event.stopPropagation();
    const overlay = document.getElementById('questionOverlay');
    overlay.remove();
    const videoElement = document.querySelector('video');
    videoElement.controls = true;
    videoElement.play();
    videoElement.removeEventListener('play', preventVideoPlay);
  }
  questionsContainer.appendChild(closeButton); 

  const nextButton = document.createElement("button");
  nextButton.innerText = "next";
  nextButton.style.padding = '7px';
  nextButton.style.width = '60px'; // next 버튼의 가로 길이 설정
  nextButton.style.height = '30px';
  nextButton.style.borderRadius = '15px';
  nextButton.style.backgroundColor = 'rgb(15, 15, 15)';
  nextButton.style.color = 'white';
  nextButton.style.border = 'none';
  nextButton.style.cursor = 'pointer';
  nextButton.onclick = (event) => {
    event.stopPropagation();
    if(index === 1) {
      const selectedOption = CbtAnswers[index];
      if(!selectedOption) {
        alert("답변을 선택해 주세요.");
        return;
      }

      if (selectedOption === '아니오' || selectedOption === '잘 모르겠습니다') {
        currentCbtQuestionIndex = 2;
      } else {
        currentCbtQuestionIndex = 3;
      }
      displayCbtQuestion(currentCbtQuestionIndex);
    } else {
      if (!CbtAnswers[index] || CbtAnswers[index].trim() === "") {
        alert("답변을 입력해 주세요.");
        return;
      }

      currentCbtQuestionIndex++;
      displayCbtQuestion(currentCbtQuestionIndex);
    }
  };

  if (index === 1) {
    questionDiv.innerHTML = `<p>${CbtQuestions[1]}</p>`;
    const optionContainer = document.createElement("div");
    optionContainer.className = "option-row";
    optionsDiv.style.marginTop = '20px';

    CbtOptions.forEach((option) => {
      const radioInput = document.createElement("input");
      radioInput.type = "radio";
      radioInput.name = `cbtQuestion${index}`;
      radioInput.value = option;

      radioInput.onclick = (event) => {
        event.stopPropagation();
        CbtAnswers[index] = radioInput.value;
      };

      const label = document.createElement("label");
      label.innerText = option;

      label.onclick = (event) => {
        event.stopPropagation();
        radioInput.checked = true;
      };

      optionContainer.appendChild(radioInput);
      optionContainer.appendChild(label);
    });
    optionsDiv.appendChild(optionContainer);
    optionsDiv.appendChild(nextButton);
  } else {
    questionDiv.innerHTML = `<p>${CbtQuestions[index]}</p>`;
    const input = document.createElement("textarea");
    input.style.marginTop = '15px';
    input.style.width = '80%';
    input.placeholder = "답변을 입력하세요...";

    input.addEventListener('input', (event) => {
      CbtAnswers[index] = input.value;
      event.stopPropagation();
    });

    // 키 입력 이벤트 처리
input.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.key === ' ') {
    console.log('space');
    event.preventDefault(); // Space 입력의 기본 동작 방지
    event.stopImmediatePropagation();
  }
});

// MutationObserver를 한 번만 설정
const observer = new MutationObserver(() => {
  const iframe = document.querySelector('iframe');
  if (iframe) {
    iframe.contentWindow.addEventListener('keydown', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
    observer.disconnect(); // 더 이상 감지할 필요 없으므로 종료
  }
});

// YouTube DOM 변화 감지 시작
observer.observe(document.body, { childList: true, subtree: true });

// 입력창 추가
questionDiv.appendChild(input);
    
    
    
    //optionsDiv.appendChild(input);

    if(currentCbtQuestionIndex === 3){
      const finishButton = document.createElement("button");
      finishButton.style.padding = '7px';
      finishButton.style.width = '60px'; 
      finishButton.style.height = '30px';
      finishButton.style.borderRadius = '15px';
      finishButton.style.backgroundColor = 'rgb(15, 15, 15)';
      finishButton.style.color = 'white';
      finishButton.style.border = 'none';
      finishButton.style.cursor = 'pointer';
      finishButton.innerText = "완료";
      finishButton.onclick = (event) => {
        event.stopPropagation();
        alert("답변이 완료되었습니다. 우측 상단의 활동을 진행해주세요.");
        console.log("저장된 답변:", CbtAnswers);
        const videoElement = document.querySelector('video');
        if (videoElement) {
          videoElement.controls = true; 
          videoElement.play();
    
          videoElement.removeEventListener('play', preventVideoPlay);
        }
  
    
        const overlay = document.getElementById('questionOverlay');
        if (overlay) {
          overlay.remove();
        }
        addQuestionContainer()
      };
      optionsDiv.appendChild(finishButton);
    } else {
      optionsDiv.appendChild(nextButton);
    }
  }

  questionDiv.appendChild(optionsDiv);
  questionWrapper.appendChild(questionDiv);
  questionsContainer.appendChild(questionWrapper);
}

// 페이지의 오른쪽 위에 솔루션 박스 생성
function addQuestionContainer() {
  const observer = new MutationObserver((mutations, observer) => {
    const sideBar = document.querySelector('#secondary');
    if (sideBar) {
      const questionContainer = document.createElement('div');
      questionContainer.id = 'questionContainer2';
      questionContainer.classList.add('custom-question-space');

      sideBar.insertBefore(questionContainer, sideBar.firstChild);

      observer.disconnect();
    } else {
      console.log("SideBar not found yet."); 
    }
    showQuestPopup()
  });
observer.observe(document.body, { childList: true, subtree: true });
}
// 게임 팝업 띄움
function showQuestPopup() {
  const questionsContainer = document.getElementById('questionContainer2');
  questionsContainer.style.display = 'flex';
  questionsContainer.style.flexDirection = 'column';
  questionsContainer.style.alignItems = 'center'; 
  questionsContainer.style.gap = '10px';

  const questWrapper = document.createElement("div");
  questWrapper.style.display = 'flex';
  questWrapper.style.justifyContent = 'center'; 
  questWrapper.style.width = '100%';

  const questText = document.createElement("p");
  questText.innerText = "   간단한 게임은 부정적인 생각으로부터 \n 일시적으로 휴식을 제공합니다. \n 분위기를 전환하러 가볼까요?";
  questText.style.fontSize = '15px';
  questText.style.textAlign = 'left'; 
  questText.style.color = "#131313"; 
  questText.style.fontFamily = "Roboto, Arial, sans-serif"; 
  questText.style.fontWeight = "700"; 
  

  const questImage = document.createElement("img");
  questImage.src = chrome.runtime.getURL("candy_crush.jpg"); 
  questImage.alt = "Quest Image";
  questImage.style.width = "50%"; 

  const questButton = document.createElement("button");
  questButton.innerText = "Go!";
  questButton.style.padding = '7px';
  questButton.style.width = '85px'; 
  questButton.style.height = '35px';
  questButton.style.borderRadius = '15px';
  questButton.style.backgroundColor = 'rgb(15, 15, 15)';
  questButton.style.color = 'white';
  questButton.style.border = 'none';
  questButton.style.cursor = 'pointer';
  questButton.onclick = () => {
    window.open('https://igre.games/ko/candy-crush-saga/play/', '_blank'); 
  };

  questWrapper.appendChild(questText);
  questionsContainer.appendChild(questWrapper);
  questionsContainer.appendChild(questImage);
  questionsContainer.appendChild(questButton);
}

let playAttemptCount = 0;

// warningPerson, warningVideo가 true일때 영상 시청 제한
function videoPrevent(){

  const videoElement = document.querySelector('video');

  if (warningPerson && warningVideo) {
    if (playAttemptCount >= 2) {
      const videoElement = document.querySelector('video');
      preventVideoPlay();
      videoElement.addEventListener('play', preventVideoPlay);

      alert("우울을 유발할 수 있는 영상을 너무 많이 보고 있습니다. 다른 영상을 보는 것은 어떨까요?");
    } else {
      playAttemptCount++; 

      alert("우울을 유발할 수 있는 영상을 너무 많이 보고 있습니다. 다른 영상을 보는 것은 어떨까요?");
    }
  } else {
    if (videoElement) {
      videoElement.controls = true; 
      videoElement.play(); 
      videoElement.removeEventListener('play', preventVideoPlay); 
    }
  }
}

// 유튜브 홈 화면 영상 대체
async function filterVideos() {
  const replacementElements = document.querySelectorAll('[data-replacement="true"]');
  replacementElements.forEach(element => element.remove());
  
  const videoElements = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer');

  for (const video of videoElements) {
    const linkElement = video.querySelector('a.yt-simple-endpoint');
    
    if (linkElement) {
      const videoUrl = linkElement.href;

      const videoData = await checkVideoDepressive(videoUrl);

      if (videoData && videoData.is_depressive === "yes") {
        video.style.display = 'none';
        console.log(`Video hidden: ${videoUrl}`);

        // 새로운 영상 요소를 생성하여 추가
        const replacementVideo = document.createElement('ytd-rich-item-renderer');
        replacementVideo.setAttribute('data-replacement', 'true'); 
        replacementVideo.innerHTML = `
          <div id="content" class="style-scope ytd-rich-item-renderer">
            <ytd-rich-grid-media class="style-scope ytd-rich-item-renderer" lockup="true">
              <div id="dismissible" class="style-scope ytd-rich-grid-media"> 
                <div id="thumbnail" class="style-scope ytd-rich-grid-media" style="width: 100%; height: 0; padding-bottom: 56.25%; position: relative;">
                  <a href="https://www.youtube.com/watch?v=${videoData.video_id}" target="_blank" class="yt-simple-endpoint" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                    <img src="https://img.youtube.com/vi/${videoData.video_id}/0.jpg" alt style="background-color: transparent; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                  </a>
                </div>
                <div id="details" class="style-scope ytd-rich-grid-media" style="width: 100%; margin-top: 12px;">
                  <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                    <a href="${videoData.channel_profile_link}" target="_blank" style="text-decoration: none;">
                      <img src="${videoData.channel_profile_image}" alt="Channel Profile" style="width: 36px; height: 36px; border-radius: 50%; margin-right: 8px;">
                    </a>
                    <div style="flex: 1;">
                      <a href="https://www.youtube.com/watch?v=${videoData.video_id}" target="_blank" style="text-decoration: none;">
                        <h3 style="font-size: 16px; font-family: 'Roboto', Arial, sans-serif; color: #0F0F0F; margin: 0; line-height: 1.2;">${videoData.title}</h3>
                      </a>
                      <div style="color: #606060; font-size: 0.9rem; margin-top: 4px;">
                        <a href="${videoData.channel_profile_link}" target="_blank" style="color: inherit; text-decoration: none;">
                          <div style="font-size: 14px;">${videoData.channel_name}</div>
                        </a>
                          <div style="font-size: 14px;">${videoData.view_count} • ${videoData.days_ago}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ytd-rich-grid-media>
          </div>
        `;
        replacementVideo.style.marginBottom = '16px';

        video.replaceWith(replacementVideo);
      }
    }
  }
} 

// 현재 영상 url인지 확인
function isVideoURL(url) {
  return url.includes("watch?v=");
}

function handleURLChange() {
  if (window.location.href !== lastURL) {
      if (isVideoURL(window.location.href)) {
          console.log("URL:", window.location.href);
          sendURLToServer(window.location.href);
      } else if (window.location.pathname === '/' && window.location.search === '') {
        if (warningPerson) {
          setTimeout(() => {
            filterVideos();
          }, 2000); 
        }
      }

      lastURL = window.location.href;
  }
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
          handleURLChange();
      }
  });
});

handleURLChange();

observer.observe(document.body, { childList: true, subtree: true });

let checkInterval;
function startInterval() {
  if (!warningPerson) {
    checkInterval = setInterval(() => {
      checkServerResponse();

      // warningPerson이 true인지 체크하여 true면 Interval 멈춤
      if (warningPerson) {
        clearInterval(checkInterval);
        console.log("Interval stopped as warningPerson is now true.");
      }
    }, 10000);
  }
}

window.addEventListener('load', () => {
  //displayQuestionsOverlay();
  startInterval();
  //filterVideos();
});