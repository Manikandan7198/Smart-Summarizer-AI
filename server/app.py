from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pptx import Presentation
from pptx.util import Inches
from graphviz import Digraph
from fpdf import FPDF
from sqlalchemy import create_engine, text
import urllib
import io
import pandas as pd
import google.generativeai as genai
import os
from gtts import gTTS
import re
import zipfile
import tempfile
import pyodbc
import uuid
import json



app = Flask(__name__)
CORS(app)

# Configure API Key securely
genai.configure(api_key='AIzaSyBkRK3EELv9u3S0o4XZEmgcAUTFdbFjhvU')  # Replace with env var in production
print('entered')

# Playing audio to avoid the special characters 
def clean_text_for_speech(text):
    text = re.sub(r'^[Oo]kay[,.]?\s*', '', text)  # Remove starting "Okay"
    text = re.sub(r'[^\w\s.,:;\-]', '', text)     # Remove unwanted punctuation
    text = re.sub(r'\s+', ' ', text)  
    return text.strip()


# DB Connection String
params = urllib.parse.quote_plus(
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=DESKTOP-H53KUNK\\SQLEXPRESS;"
    "Database=SmartAI;"
    "UID=NodeAPI;"
    "PWD=NodeAPI@123;"
    "Trusted_Connection=no;"
)

engine = create_engine("mssql+pyodbc:///?odbc_connect=%s" % params)

first_time_db_check = True
flag = False

#For New chat
@app.route('/restart', methods=['POST'])
def restart():
    global first_time_db_check
    global flag
    try:
        first_time_db_check = True
        flag = False
        return 'Restarting the server...', 200
    except Exception as e:
        print("Exception occurred:", e)
        return jsonify({"error": str(e)}), 500



# Endpoint for Login 
@app.route("/getlogin_data", methods=['GET'])
def get_data():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM Login"))
        data = [dict(row._mapping) for row in result]
    return jsonify(data)


# Chatresponse 
@app.route('/generate_chatresponse', methods=['POST'])
def generate_chatresponse():
    global first_time_db_check
    global flag
    try:
        question = request.form.get('question', '')
        print("Question:", question)

        # Step 1: Ask Gemini if the question is DB-related
        prompt_check = f"""
        Question: {question}
        Is this question asking answer from database? Respond only with boolean 'true' or 'false'.
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash")
        response_check = model.generate_content(prompt_check)
        is_db_question = response_check.text.strip().lower() == 'true'
        if first_time_db_check:
            first_time_db_check = False
            if is_db_question:
                flag = True
            else:
                flag = False

        if is_db_question:
            flag = True

        if is_db_question or flag:
            # Step 2: Query DB
            with engine.connect() as conn:
                result = conn.execute(text("SELECT * FROM Login"))
                data = [dict(row._mapping) for row in result]
                print("DB Data:", data)

            # Step 3: Use Gemini to analyze DB + question
            response = model.generate_content(f"""
            You are a software assistant. Analyze the following project data and answer the question below.

            Question: "{question}"

            Data:
            {json.dumps(data)}
            """)
        else:
            # Not DB-related, just generate a regular response
            response = model.generate_content(f"Question: {question}")

        explain_prompt = f"""
        Please explain this summary in natural spoken English for a non-technical audience:
        "{response.text}"
        """
        explanation = model.generate_content(explain_prompt)
        explanation_text = clean_text_for_speech(explanation.text)

        # Step 4: Convert response to audio
        audio_filename = f"overview_audio_{uuid.uuid4().hex}.mp3"
        audio_overview_path = os.path.join("static", audio_filename)
        overview_clean = clean_text_for_speech(response.text)
        overview_audio = gTTS(text=explanation_text, lang='en')
        overview_audio.save(audio_overview_path)

        return jsonify({
            "summary": response.text,
            "audio_overview_url": f"http://127.0.0.1:5000/static/{os.path.basename(audio_filename)}",
        })

    except Exception as e:
        print("Exception occurred:", e)
        return jsonify({"error": str(e)}), 500

# Genrating PDF Response
@app.route('/generate_response', methods=['POST'])
def generate_response():
    try:
        print("Request received")
        file = request.files.get('file')
        user_question = request.form.get('question')

        if not file or not user_question:
            return jsonify({"error": "Missing file or question"}), 400

        filename = file.filename
        full_prompt = ""

        if filename.endswith('.zip'):
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_path = os.path.join(temp_dir, filename)
                file.save(zip_path)

                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)

                for root, dirs, files in os.walk(temp_dir):
                    for name in files:
                        path = os.path.join(root, name)
                        if name.endswith('.js'):
                            with open(path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                full_prompt += f"\nJavaScript File ({name}):\n{content}\n"
                        elif name.endswith('.xlsx') or name.endswith('.xls'):
                            df = pd.read_excel(path, engine='openpyxl')
                            data_text = df.head(100).to_csv(index=False)
                            full_prompt += f"\nExcel File ({name}):\n{data_text}\n"

        elif filename.endswith('.js'):
            file_content = file.read().decode('utf-8')
            full_prompt = f"JavaScript File:\n{file_content}"
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(file, engine='openpyxl')
            data_text = df.head(100).to_csv(index=False)
            full_prompt = f"Excel File:\n{data_text}"
        else:
            return jsonify({"error": "Unsupported file format"}), 400

        print("Prompting Gemini for analysis...")
        model = genai.GenerativeModel("models/gemini-2.0-flash")
        response = model.generate_content(f"""
        You are a software assistant. Analyze the following files and answer the question:
        "{user_question}"
        
        Files:
        {full_prompt}
        """)

        prompt2 = f"""
        Question: {user_question}
        Is this question asking for a PDF file? Respond only with boolean 'true' or 'false'.
        """
        response2 = model.generate_content(prompt2)

        explain_prompt = f"Please explain this summary in simple spoken English for audio narration:\n{response.text}"
        explanation = model.generate_content(explain_prompt)
        explanation_text = clean_text_for_speech(explanation.text)
        audio_filename = f"overview_audio_{uuid.uuid4().hex}.mp3"
        audio_overview_path = os.path.join("static", audio_filename)
   

        overview_clean = clean_text_for_speech(response.text)
        # sample_output_clean = clean_text_for_speech(sample_output)

        overview_audio = gTTS(text=explanation_text, lang='en')
        # flowchart_audio = gTTS(text="Flowchart Explanation: The flowchart describes steps like start, process, decision, and end.", lang='en')
        # sample_output_audio = gTTS(text="Sample Output Explanation: " + sample_output_clean, lang='en')

        overview_audio.save(audio_overview_path)

        if response2.text.strip() != 'true':
            return jsonify({
                'summary': response.text,
                'audio_overview_url': f'http://127.0.0.1:5000/static/{audio_filename}',
            })
        # Generate flowchart and PDF
        prompt1 = f"""
        You are an assistant that extracts flowchart steps from descriptions.

        For the following description, break it into ordered steps with labels:
        - Use "start", "process", "decision", "limitation", or "end"
        - Provide label and text like this:
        start: Begin process
        process: Do something
        decision: Is X available?
        limitation: Feature not supported
        end: End process

        Description:
        {response.text}
        """
        response1 = model.generate_content(prompt1)
        parsed_text = response1.candidates[0].content.parts[0].text

        dot = Digraph(format='png')
        lines = parsed_text.strip().split('\n')
        prev_id = None
        node_counter = 0
        decision_map = {}

        for line in lines:
            if ':' not in line:
                continue
            shape_type, label = line.split(':', 1)
            shape_type = shape_type.strip().lower()
            label = label.strip()

            node_id = f"n{node_counter}"
            node_counter += 1

            shape = {
                "start": "circle",
                "end": "circle",
                "process": "rectangle",
                "decision": "diamond",
                "limitation": "parallelogram"
            }.get(shape_type, "rectangle")

            dot.node(node_id, label, shape=shape)

            if shape_type == "decision":
                decision_map['id'] = node_id
                continue

            if prev_id:
                if 'id' in decision_map:
                    dot.edge(decision_map['id'], node_id, label="Yes")
                    decision_map.pop('id')
                else:
                    dot.edge(prev_id, node_id)

            prev_id = node_id

        flowchart_path = "dynamic_flowchart.png"
        dot.render("dynamic_flowchart", view=False)

        
        content = response.text
        base_filename = os.path.splitext(filename)[0]
        pdf_title = f"{base_filename} Analysis Report"
        pdf_file_path = os.path.join('static', f"{base_filename}_Analysis_Report.pdf")

        if not os.path.exists('static'):
           os.makedirs('static')

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt=pdf_title, ln=True, align='C')
        pdf.multi_cell(0, 10, response.text)
        pdf.image(flowchart_path, x=10, w=190)

        
        pdf.output(pdf_file_path)

        
         # Audio files Genration
        audio_filename = f"overview_audio_{uuid.uuid4().hex}.mp3"
        audio_overview_path = os.path.join("static", audio_filename)

        overview_clean = clean_text_for_speech(response.text)
        # sample_output_clean = clean_text_for_speech(sample_output)

        overview_audio = gTTS(text=overview_clean, lang='en')
        

        overview_audio.save(audio_overview_path)
        

        return jsonify({
            'pdf_url': f'http://127.0.0.1:5000/static/{os.path.basename(pdf_file_path)}',
            'audio_overview_url': f'http://127.0.0.1:5000/static/{audio_filename}'
            # 'audio_flowchart_url': f'http://127.0.0.1:5000/static/{os.path.basename(audio_flowchart_path)}',
            # 'audio_sample_output_url': f'http://127.0.0.1:5000/static/{os.path.basename(audio_sample_output_path)}',
        })

    except Exception as e:
        print('fileexception', e)
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
