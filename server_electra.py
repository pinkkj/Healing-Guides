# 이 코드는 10분이상이면 경고주도록 설정한 코드입니다! test 인거죠ㅎ
from flask import Flask, request, jsonify
import pandas as pd
import os
from datetime import datetime
import pytz
import re
from googleapiclient.discovery import build
from flask_cors import CORS
from langchain_community.chat_models import ChatOpenAI 
from langchain.prompts import PromptTemplate
import random
from predict import predict_title
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
# Flask 앱 설정

app = Flask(__name__)
CORS(app)

# YouTube Data API 키
api_key = ###
youtube = build('youtube', 'v3', developerKey=api_key)

# OpenAI 감정 분석 모델 설정
OPENAI_KEY = ###
llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", openai_api_key=OPENAI_KEY)


# 우울감의 원인과 깊은 감정을 유발할 수 있는 핵심 키워드 2개를 정확히 추출하는 프롬프트 템플릿 (한국어)
keyword_extraction_prompt = PromptTemplate(
    input_variables=["description", "title"],
    template=(
        "다음의 영상 제목과 설명을 분석하여, 시청자가 슬픔이나 우울함을 느낄 수 있는 이유를 가장 잘 나타내는 핵심 키워드 두 개를 추출해주세요. "
        "이 키워드는 죽음, 상실, 폭력 등과 같은 중요한 사건이나 주제를 반영해야 합니다. "
        "일반적이거나 모호한 키워드는 피하고, 구체적이고 감정적으로 강한 키워드만 추출해주세요.\n\n"
        "제목: {title}\n설명: {description}\n"
        "우울감의 주요 원인을 나타내는 핵심 키워드 두 개를 추출하세요:"
    )
)

# 분석 함수
def analyze_video_content(title, description=None):
    # description이 없을 때 기본값으로 빈 문자열 설정
    if not description:
        description = "N/A"

    # 프롬프트 템플릿에 제목과 설명을 채워 넣고 LLM 호출
    keword_prompt_text = keyword_extraction_prompt.format(title=title, description=description)
    # LLM 호출 - invoke() 메서드 사용 후 .content로 텍스트 추출
    keword_response = llm.invoke(keword_prompt_text)
    # 응답에서 텍스트 추출 및 기본값 설정
    keyword_result = keword_response.content.strip() if keword_response.content else "N/A"

    tokenizer = AutoTokenizer.from_pretrained(model_name)  # 토크나이저 정의
    depressive_result = predict_title(title, model, tokenizer, device)
    print(f"Prediction: {depressive_result}")
    return {
        "is_depressive": depressive_result,
        "keywords": keyword_result
    }


view_time_dict = {}
active_sessions = {}
# 클라이언트 IP 주소 가져오기
def get_client_id():
    return request.remote_addr

# video 정보 가져오기
def get_video_info(video_url, client_ip):
    kst = pytz.timezone('Asia/Seoul')
    current_time = datetime.now(kst).strftime("%Y-%m-%d %H:%M:%S")
    video_id = re.search(r"shorts/([^?&]+)", video_url) or re.search(r"v=([^&]+)", video_url)

    if video_id:
        video_id = video_id.group(1)
    else:
        return {}

    request = youtube.videos().list(part="snippet,contentDetails", id=video_id)
    response = request.execute()

    if "items" in response and len(response["items"]) > 0:
        video_info = response["items"][0]
        title = video_info["snippet"]["title"]
        description = video_info["snippet"]["description"]

        result = analyze_video_content(title, description)

        is_depressive = result["is_depressive"]
        keywords = result["keywords"]

        duration = video_info["contentDetails"]["duration"]

        # 시간 포맷 변환 (ISO 8601 -> 초)
        duration_seconds = parse_duration_to_seconds(duration)

        
        if client_ip in active_sessions:
            # 이전 영상 처리
            update_view_time(client_ip, current_time, is_depressive)

        # 새로운 세션을 active_sessions에 추가

        if(is_depressive == "yes"):
            print("\n 우울한 영상 시청기록 추가")
            active_sessions[client_ip] = {
                'start_time': datetime.now(kst),
                'duration_seconds': duration_seconds,
                'is_depressive': is_depressive,
                "keywords":keywords
            }

        print("\n")
        print(f"Active session updated for {active_sessions}")
        print("\n")
        print(view_time_dict)

        # is_depressive의 값에서 마침표(.) 제거
        if "." in is_depressive:
            is_depressive = is_depressive.replace(".", "")

        # 데이터프레임에 클라이언트 IP 주소 추가
        data = {
            "Timestamp": current_time,
            "IP Address": client_ip,
            "Title": title,
            "Description": description,
            "Duration": duration,
            "is_depressive": is_depressive,
            "keyword": keywords
        }

        data_client = {
            "is_depressive": is_depressive
        }

        save_to_excel(data)
        return data_client
    else:
        return {"error": "동영상 정보를 찾을 수 없습니다."}
    
# 시간을 초로 변경
def parse_duration_to_seconds(duration):
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds

# 시간 누적
def update_view_time(client_ip, end_time, now_is_depressive):
    global active_sessions, view_time_dict
    if client_ip in active_sessions:
        session = active_sessions[client_ip]
        start_time = session['start_time']
        duration_seconds = session['duration_seconds']
        keywords = session["keywords"]
        is_depressive = now_is_depressive
        date_key = start_time.date()
        print("\nkeywords: ", keywords)
        
        # end_time이 문자열인 경우 datetime 객체로 변환
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        # end_time에 시간대 정보 추가
        kst = pytz.timezone('Asia/Seoul')
        if end_time.tzinfo is None:  # offset-naive인 경우
            end_time = kst.localize(end_time)

        print('\n')
        print("end_time과 start time확인 \n")
        print("end time=",end_time)
        print("start time=", start_time)

        actual_duration = (end_time - start_time).total_seconds()
        print("\n 실제 시청시간 = ", actual_duration)
        if duration_seconds < actual_duration <= duration_seconds + 300:
            print("\n 영상시청 시간 넘고 5분 안지남")
            actual_duration = duration_seconds
        elif actual_duration > duration_seconds + 300:
            print("\n영상시간 지나고 5분 더 지나서 나간걸로 판명. 초기화!")
            if client_ip in view_time_dict and date_key in view_time_dict[client_ip]:
                del view_time_dict[client_ip][date_key]
                return

        # 우울한 영상일 때만 누적
        if is_depressive == "yes":
            print("\n우울한 영상이 들어왔으니 누적!")
            if client_ip not in view_time_dict:
                view_time_dict[client_ip] = {}
            if date_key not in view_time_dict[client_ip]:
                    view_time_dict[client_ip][date_key] = {
                        "start_time": start_time,
                        "total_time": 0,
                        "warning_sent": False,
                        "keywords": {} 
                    }
            
            view_time_dict[client_ip][date_key]["total_time"] += actual_duration

            # 키워드 횟수 누적하기
            if "keywords" in active_sessions[client_ip]:
                keywords = active_sessions[client_ip]["keywords"].replace("\n", ", ").split(", ")
                keywords = [keyword.strip("- ").strip() for keyword in keywords if keyword.strip("- ").strip()]  # 문자열을 리스트로 변환
                if 'keywords' not in view_time_dict[client_ip][date_key]:
                    view_time_dict[client_ip][date_key]['keywords'] = {}
                for keyword in keywords:
                    if keyword in view_time_dict[client_ip][date_key]["keywords"]:
                        view_time_dict[client_ip][date_key]["keywords"][keyword] += 1  # 키워드 등장 횟수 증가
                    else:
                        view_time_dict[client_ip][date_key]["keywords"][keyword] = 1  # 새로운 키워드 추가

            # 30분(1800초) 이상일 때 경고 전송
            if view_time_dict[client_ip][date_key]["total_time"] >= 30:
                if not view_time_dict[client_ip][date_key]["warning_sent"]:
                    view_time_dict[client_ip][date_key]["warning_sent"] = True
                    warning_messages[client_ip] = {"date":date_key,"warning": True, "message": "30분 이상 시청으로 경고 전송됨"}
        else:
            # 우울한 영상이 아닌 경우 해당 날짜의 기록 삭제
            print("\n")
            print("우울하지 않은 영상이 들어왔으니 초기화 하겠습니다.(단, 이전영상까지 30분 시청했나 확인)")
            if client_ip in view_time_dict and date_key in view_time_dict[client_ip]:
                if (view_time_dict[client_ip][date_key]["total_time"] + actual_duration) >= 30:
                    print("\n어머? 30분 이상 시청하셨네요?")
                    if not view_time_dict[client_ip][date_key]["warning_sent"]:
                        view_time_dict[client_ip][date_key]["warning_sent"] = True
                        view_time_dict[client_ip][date_key]["total_time"] += actual_duration
                        warning_messages[client_ip] = {"date":date_key,"warning": True, "message": "30분 이상 시청으로 경고 전송됨"}
                else:
                    del view_time_dict[client_ip][date_key]

        # 세션 종료
        del active_sessions[client_ip]

# CSV 파일에 데이터 저장 함수
def save_to_excel(data):
    file_name = "youtube_data.xlsx"
    df = pd.DataFrame([data])

    if os.path.exists(file_name):
        existing_df = pd.read_excel(file_name)
        if not ((existing_df['Timestamp'] == data['Timestamp']) & 
                (existing_df['Title'] == data['Title'])).any():
            updated_df = pd.concat([existing_df, df], ignore_index=True)
            updated_df.to_excel(file_name, index=False, engine="openpyxl")
    else:
        df.to_excel(file_name, index=False, engine="openpyxl")

# 클라이언트 상태를 저장하는 딕셔너리
warning_messages = {}


# 홈화면 영상 감지 (우울 or not)
def format_view_count(view_count):
    """조회수를 사람이 읽기 쉬운 형식으로 포맷합니다."""
    view_count = int(view_count)
    if view_count >= 1_000_000:
        return f"{view_count // 1_000_000}M views"
    elif view_count >= 1_000:
        return f"{view_count // 1_000}K views"
    else:
        return f"{view_count} views"

def format_days_ago(days):
    """날짜를 사람이 읽기 쉬운 형식으로 포맷합니다."""
    if days >= 365:
        years = days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif days >= 30:
        months = days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    else:
        return f"{days} day{'s' if days > 1 else ''} ago"

def get_random_url_from_excel(file_path):
    # Load the current state if it exists
    state_file = 'url_state.pkl'
    if os.path.exists(state_file):
        accessed_urls = pd.read_pickle(state_file)
    else:
        accessed_urls = set()

    # Load the Excel file
    df = pd.read_excel(file_path)
    urls = df['URL'].tolist()

    # Get the remaining URLs that haven't been accessed
    remaining_urls = list(set(urls) - accessed_urls)

    # If all URLs have been accessed, reset the state
    if not remaining_urls:
        accessed_urls = set()
        remaining_urls = urls

    # Select a random URL and update the state
    chosen_url = random.choice(remaining_urls)
    accessed_urls.add(chosen_url)

    # Save the updated state
    pd.to_pickle(accessed_urls, state_file)

    return chosen_url

def detect_depression(video_url):
    video_id = re.search(r"shorts/([^?&]+)", video_url) or re.search(r"v=([^&]+)", video_url)
    
    # data_client 초기화
    data_client = {}

    if video_id:
        video_id = video_id.group(1)
    else:
        return {}

    request = youtube.videos().list(part="snippet,contentDetails,statistics", id=video_id)
    response = request.execute()

    if "items" in response and len(response["items"]) > 0:
        video_info = response["items"][0]
        title = video_info["snippet"]["title"]
        description = video_info["snippet"]["description"]

        # 분석 결과
        result = analyze_video_content(title, description)
        is_depressive = result["is_depressive"]
        print("\n판단된 is_depressive 값 =", is_depressive)

        # 엑셀에 저장할 데이터
        data_to_save = {
            "title": title,
            "description": description,
            "is_depressive": is_depressive
        }

        # 기존 엑셀 파일이 있는지 확인하고, 없으면 새 파일 생성
        try:
            df_existing = pd.read_excel("video_analysis_results.xlsx")
            df = pd.DataFrame([data_to_save])
            df_combined = pd.concat([df_existing, df], ignore_index=True)
        except FileNotFoundError:
            df_combined = pd.DataFrame([data_to_save])

        # 엑셀 파일로 저장
        df_combined.to_excel("video_analysis_results.xlsx", index=False)
        print("분석 결과가 'video_analysis_results.xlsx'에 저장되었습니다.")

        # is_depressive가 'yes'일 경우 URL을 엑셀에서 랜덤으로 가져오기
        if is_depressive == "yes":
            chosen_url = get_random_url_from_excel("video.xlsx")
            new_video_data = chosen_url  # 서버에서 가져온 링크

            new_video_id = re.search(r"v=([^&]+)", new_video_data).group(1)
            new_request = youtube.videos().list(part="snippet,contentDetails,statistics", id=new_video_id)
            new_response = new_request.execute()

            if "items" in new_response and len(new_response["items"]) > 0:
                new_video_info = new_response["items"][0]
                new_title = new_video_info["snippet"]["title"]
                new_channel_id = new_video_info["snippet"]["channelId"]
                new_channel_title = new_video_info["snippet"]["channelTitle"]
                new_view_count = new_video_info["statistics"].get("viewCount", "N/A")
                new_published_at = new_video_info["snippet"]["publishedAt"]

                # 날짜 포맷 변환
                new_published_date = datetime.strptime(new_published_at, "%Y-%m-%dT%H:%M:%SZ")
                new_days_ago = (datetime.now() - new_published_date).days

                # 포맷팅된 조회수와 날짜 생성
                new_formatted_view_count = format_view_count(new_view_count)
                new_formatted_days_ago = format_days_ago(new_days_ago)

                # 새로운 채널 정보 가져오기 (채널 프로필 이미지 포함)
                new_channel_request = youtube.channels().list(part="snippet", id=new_channel_id)
                new_channel_response = new_channel_request.execute()

                if "items" in new_channel_response and len(new_channel_response["items"]) > 0:
                    new_channel_info = new_channel_response["items"][0]
                    new_channel_profile_image = new_channel_info["snippet"]["thumbnails"]["default"]["url"]
                    new_channel_profile_link = f"https://www.youtube.com/channel/{new_channel_id}"
                else:
                    new_channel_profile_image = "N/A"
                    new_channel_profile_link = "N/A"

                # 반환할 데이터 생성
                data_client = {
                    "video_id": new_video_id,
                    "title": new_title,
                    "channel_name": new_channel_title,
                    "view_count": new_formatted_view_count,
                    "days_ago": new_formatted_days_ago,
                    "channel_profile_image": new_channel_profile_image,
                    "channel_profile_link": new_channel_profile_link,
                    "is_depressive": is_depressive
                }
                print("----홈화면 감지 중...----")
            else:
                return {"error": "유효하지 않은 비디오 정보입니다."}

    if not data_client:
        return {}


    return jsonify(data_client)



# 경고 상태를 확인하는 API 엔드포인트
@app.route('/check_warning', methods=['POST'])
def check_warning():
    print("\n클라이언트측에서 경고 확인하려고 메세지 보냄")
    current_time = datetime.now(pytz.timezone('Asia/Seoul'))
    client_ip = get_client_id()
    if client_ip in active_sessions:
        start_time = active_sessions[client_ip]["start_time"]
        duration_seconds = active_sessions[client_ip]['duration_seconds']
        date_key = start_time.date()

        if client_ip in view_time_dict and date_key in view_time_dict[client_ip]:
            # 30분(1800초) 이상 시청 시 경고 전송
            if ((current_time - start_time).total_seconds() + view_time_dict[client_ip][date_key]["total_time"]) >= 30:
                if not view_time_dict[client_ip][date_key]["warning_sent"]:
                    view_time_dict[client_ip][date_key]["warning_sent"] = True
                    warning_messages[client_ip] ={"date":date_key,"warning": True, "message": "30분 이상 시청으로 경고 전송됨"}
                    print("\n30분 이상 시청으로 경고 전송됨(정기적 체크 중 발견.)")
        else:
            if((current_time - start_time).total_seconds()) >= 30:
                if client_ip not in view_time_dict:
                    view_time_dict[client_ip] = {}
                if date_key not in view_time_dict[client_ip]:
                    view_time_dict[client_ip][date_key] = {
                        "start_time": start_time,
                        "total_time":0,
                        "warning_sent":False,
                        "keywords":{}
                    }
                # 키워드 횟수 누적하기
                if "keywords" in active_sessions[client_ip]:
                    keywords = active_sessions[client_ip]["keywords"].replace("\n", ", ").split(", ")
                    keywords = [keyword.strip("- ").strip() for keyword in keywords if keyword.strip("- ").strip()]  # 문자열을 리스트로 변환
                    if 'keywords' not in view_time_dict[client_ip][date_key]:
                        view_time_dict[client_ip][date_key]['keywords'] = {}
                    for keyword in keywords:
                        if keyword in view_time_dict[client_ip][date_key]["keywords"]:
                            view_time_dict[client_ip][date_key]["keywords"][keyword] += 1  # 키워드 등장 횟수 증가
                        else:
                            view_time_dict[client_ip][date_key]["keywords"][keyword] = 1  # 새로운 키워드 추가

                view_time_dict[client_ip][date_key]["total_time"] += ((current_time - start_time).total_seconds())
                if not view_time_dict[client_ip][date_key]["warning_sent"]:
                    view_time_dict[client_ip][date_key]["warning_sent"] = True
                    warning_messages[client_ip] = {"date":date_key,"warning": True, "message": "30분 이상 시청으로 경고 전송됨"}
                    # active_session에서 삭제
                    del active_sessions[client_ip]
                    print("\n30분 이상 시청으로 경고 전송됨(정기적 체크 중 발견/첫영상)")
                print(view_time_dict)
        # 타임아웃 체크
        if (current_time - start_time).total_seconds() > (duration_seconds + 300):
            print("\n어머? 5분동안 아무 활동도 하지않으셨네요...")
            # 5분 경과 시 해당 날짜의 기록 삭제
            if client_ip in view_time_dict and date_key in view_time_dict[client_ip]:
                del view_time_dict[client_ip][date_key]
            # 세션도 삭제
            del active_sessions[client_ip]

    if client_ip in warning_messages:
        response = warning_messages[client_ip]
        return jsonify(response)
    return jsonify({"warning": False, "message": "경고 없음"})



@app.route('/analyze_video', methods=['POST'])
def analyze_video():
    print("\n----------새 영상 시청감지----------\n")
    video_url = request.json.get('url')
    if not video_url:
        return jsonify({"error": "URL이 제공되지 않았습니다."}), 400
    
    client_ip = get_client_id()
    result = get_video_info(video_url, client_ip)
    

    return jsonify(result)

@app.route('/analyze_home', methods=['POST'])
def analyze_home():
    video_url = request.json.get('url')
    if not video_url:
        return jsonify({"error": "URL이 제공되지 않았습니다."}), 400
    
    result = detect_depression(video_url)
    print(result)
    return result

# 가장 빈번한 키워드와 start_time을 반환하는 API 엔드포인트
@app.route('/get_information', methods=['POST'])
def get_information():
    client_ip = get_client_id()
    if client_ip not in view_time_dict:
        return jsonify({"error": "Client IP not found."}), 404

    # 가장 최근 날짜 가져오기
    print(view_time_dict)
    latest_date = max(view_time_dict[client_ip].keys())
    data = view_time_dict[client_ip][latest_date]

    # start_time 가져오기
    start_time = data["start_time"].astimezone(pytz.timezone('Asia/Seoul'))

    # start_time을 문자열 포맷으로 변환
    start_time_str = start_time.strftime('%Y년 %m월 %d일 %H시 %M분')

    # 키워드 딕셔너리 가져오기
    keywords = data["keywords"]

    # 가장 높은 등장 횟수 찾기
    max_count = max(keywords.values())

    # 가장 많이 등장한 키워드(동점 포함) 찾기
    most_frequent_keywords = [k for k, v in keywords.items() if v == max_count]

    response = {
        "start_time": start_time_str,  # 문자열 포맷된 시간 반환
        "most_frequent_keywords": most_frequent_keywords
    }
    print(response)
    return jsonify(response)

# 서버 실행
if __name__ == '__main__':
    # 모델 로드
    model_name = "beomi/KcELECTRA-base"
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.load_state_dict(torch.load("C:\\Users\\juven\\server\\electra_model.pth", map_location=device))
    model.to(device)
    model.eval()
    app.run(host='0.0.0.0', port=5000, threaded=True)