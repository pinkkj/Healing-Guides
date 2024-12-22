# Healing-Guides

<img width="210" alt="image" src="https://github.com/user-attachments/assets/3818b08e-6d6c-49c3-8035-03585532bfef" />

----
### 🔖프로젝트 설명

- 이 프로젝트는 크롬 확장 프로그램을 통해 우울 관련 콘텐츠 노출을 줄이고, PHQ-9 설문 검사와 반추 인지 행동 훈련, 미니 게임, 긍정적 콘텐츠 추천 등을 제공하여 사용자 정서를 개선하는 것을 목표로 합니다. 서버에서는 유튜브 API와 Electra 모델, openai를 활용해 콘텐츠를 분석합니다. 이를 통해 우울감을 낮추고 긍정적인 감정으로 전환시키는 다양한 기능을 구현하였습니다.
----

### 🔖프로젝트 배경
<img width="221" alt="image" src="https://github.com/user-attachments/assets/14249621-4790-4cf3-a734-219a403f50dd" />

- 위 사진은 새로운 유튜브 계정을 하나 만들어서 계속 우울한 영상들을 시청한 결과, 우울 관련 영상이 계속 추천 영상으로 뜨는 모습을 캡쳐한 것입니다. 이처럼 유튜브 알고리즘의 형태는 우울의 원인이 될 수도 있는 사건 관련 영상을 계속 사용자에게 추천함으로써 **반추행동을 가속화** 시킵니다.

----
### 🔖프로젝트 내용

✔️서버의 시스템 구현
1. 유튜브 데이터 수집 및 분석:
   유튜브 API를 사용해 동영상 메타데이터(제목, 설명, 조회수 등)를 수집합니다.
   Electra 모델 기반 감정 분석과 OpenAI API를 활용해 동영상이 우울 콘텐츠인지 판별하고 키워드를 추출합니다.

2. 사용자 세션 관리 및 경고 시스템:
   사용자의 시청 세션을 추적하며, 우울 콘텐츠를 30분 이상 시청한 경우 경고 메시지를 제공합니다.

3. 데이터 저장 및 추천:
   동영상 분석 결과를 Excel로 저장하며, 추천 콘텐츠를 제공하기 위해 무작위 URL을 관리합니다.
   
4. API 제공 및 배포:
   Flask 기반 API를 통해 감정 분석, 세션 정보, 경고 메시지 등 클라이언트와 통신합니다.

✔️클라이언트의 시스템 구현

1. 크롬 확장 프로그램:
   사용자의 유튜브 동영상 URL을 서버에 전송하여 우울 콘텐츠 여부를 확인합니다.
   UI/UX는 유튜브의 기존 디자인과 자연스럽게 통합되었습니다.

2. PHQ-9 검사 및 솔루션 제공:
   사용자가 우울 콘텐츠를 30분 이상 시청하면 PHQ-9 설문을 통해 우울 정도를 평가하고 적절한 조치를 제공합니다.
   심한 우울감이 감지되면 상담 사이트로 연결합니다.

3. 반추 인지 행동 질문 제공:
   서버에서 제공된 시청 시간과 키워드를 기반으로 질문을 생성해 사용자에게 제공합니다.

4. 분위기 환기 게임:
   사용자에게 간단한 웹게임을 제안해 분위기를 전환할 수 있도록 합니다.

5. 홈 화면 추천 영상 대체:
   우울 콘텐츠로 판단된 영상을 대체 콘텐츠로 변경하여 사용자가 긍정적인 경험을 할 수 있도록 합니다.

----
### 🔖서비스 구조
![image](https://github.com/user-attachments/assets/bfe82e1b-57c7-4f6b-91e7-187dba13ceef)

----
### 🔖개발 언어

<img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=Python&logoColor=white"/> <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white"/>
<img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white"/>
<br/>

### 🔖개발 도구 / 프레임워크
<img src="https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white"/> <img src="https://img.shields.io/badge/Google Colab-F9AB00?style=flat-square&logo=Google Colab&logoColor=white"/>
<img src="https://img.shields.io/badge/Visual Studio Code-007ACC?style=flat-square&logo=Visual Studio Code&logoColor=white"/>

### 🔖외부 라이브러리
[KoElectra](https://huggingface.co/beomi/KcELECTRA-base) - 감정 분석을 위해 이용 <br/>
[Openai](https://openai.com/) - 제목에서 키워드 추출 위해 이용

----
### 🔖시연영상

https://github.com/user-attachments/assets/192a05bf-9024-478e-b671-18912db446ea

----
### 🔖기대효과
- 정신 건강 관리 도구 제공: 딥러닝 모델(KcELECTRA)을 활용해 우울한 동영상 제목을 탐지하고, 사용자에게 경고 및 맞춤형 콘텐츠를 제공함으로써 정신 건강 악화를 사전에 방지할 수 있습니다.
- 윤리적 콘텐츠 관리: 우울감을 유발하는 콘텐츠의 노출을 제한하거나 사용자 상태를 고려한 콘텐츠 추천으로 플랫폼의 윤리성을 강화합니다.
- 다양한 응용 가능성: 유튜브 외에도 트위터, 페이스북, 공공기관, 개인화된 추천 알고리즘 등 다양한 영역에 적용 가능합니다.

### 🔖향후 연구 방향
- 데이터 확장: 다양한 플랫폼 데이터(댓글, 설명란 등)를 포함한 학습으로 모델의 일반화 성능을 강화합니다.
- 다중 언어 확장: 글로벌 사용자 대응을 위해 다중 언어 감정 분석 모델을 개발합니다.
- 정서적 맥락 추가: 영상 내용, 썸네일, 시청 기록 등 멀티모달 데이터를 활용해 정교한 분석을 수행합니다.
- 사용자 기반 데이터 구축: 사용자 피드백을 반영해 지속적으로 데이터를 업데이트하며 모델 성능을 개선합니다.


