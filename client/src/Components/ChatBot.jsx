import React, { useEffect, useRef, useState } from "react";
import AudioIcon from '../Assets/images/icons8-mic-30.png';
import ImageIcon from '../Assets/images/upload.png';
import Logo from '../Assets/images/logo.png';
import '../Assets/css/ChatBot.css';
import Logout from '../Assets/images/logout.png';
import samplePdf from '../Assets/images/sample.pdf';
import PdfIcon from '../Assets/images/pdf.png';
import DocIcon from '../Assets/images/doc.png';
import { useNavigate } from "react-router-dom";
import sendIcon from '../Assets/images/paper.png';
import config from '../config.json'
import Swal from 'sweetalert2';
import AIImage from '../Assets/images/AI-image.jpg';
import { ClipLoader } from 'react-spinners';
import ExcelIcon from '../Assets/images/excel.png';
import JSIcon from '../Assets/images/js-file.png';
import ZipIcon from '../Assets/images/zip.png';



export default function ChatLayout() {
    const [messages, setMessages] = useState([[]]);
    const [file, setFile] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [question, setQuestion] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const fileInputRef = useRef();
    const [audioUrls, setAudioUrls] = useState({
        overview: null,
        flowchart: null,
        sampleOutput: null
    });
    const [isLoading, setIsLoading] = useState(false)
    const [isTyping, setIsTyping] = useState(false);


    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false); // ✅ stop loading after 1.5s
        }, 1500);

        return () => clearTimeout(timer); // cleanup
    }, []);


    const navigate = useNavigate();

    const handleSend = () => {
        if (!question && !file) return;
        const newMessage = {
            question: question,
            file: file ? URL.createObjectURL(file) : null,
            filename: file?.name || null,
            type: file?.type || null,
            isUser: true,
        };

        setMessages((prev) =>
            prev.map((arr, index) =>
                index === selectedIndex ? [...arr, newMessage] : arr
            )
        );
    };

    useEffect(() => {
        handleSend();
    }, [file]);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const startListening = () => {
        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setQuestion(transcript);
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
        recognition.onend = () => {
            setIsListening(false);
        };
        recognition.start();
    };

    const handleSendData = async () => {
        if (!question) return;
        setQuestion('');
        setIsTyping(true);

        setQuestion('');
        try {
            let res = '';
            const newMessage = {
                question: question,
                file: null,
                filename: null,
                type: 'questions',
                isUser: true,
            };
            setMessages((prev) =>
                prev.map((arr, index) =>
                    index === selectedIndex ? [...arr, newMessage] : arr
                )
            );
            // setMessages((prev) => [
            //     ...prev,
            //     newMessage
            // ])
            if (!file) {
                const formData = new FormData();
                formData.append('question', question);
                res = await fetch(config.BaseURL + 'generate_chatresponse', {
                    method: 'POST',
                    // headers: {
                    //     'Content-Type': 'multipart/form-data',
                    // },
                    body: formData,
                });
                console.log("ressss", await res.clone().json());

            } else {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('question', question);
                res = await fetch(config.BaseURL + 'generate_response', {
                    method: 'POST',
                    // headers: {
                    //     'Content-Type': 'multipart/form-data',
                    // },
                    body: formData,
                });
                console.log("ressss", await res.clone().json());
            }
            if (res.ok) {
                let url = '';
                let flag = false;
                url = await res.clone().json()

                if ('summary' in url) {
                    flag = true;
                } else {
                    flag = false;
                }

                // try {
                //     const jsonRes = await res.clone().json();
                //     url = jsonRes;
                //     flag = true;
                // } catch (e) {
                //     const blob = await res.blob();
                //     url = await res.clone().json();
                // }

                setMessages((prev) =>
                    prev.map((arr, index) =>
                        index === selectedIndex
                            ? [
                                ...arr,
                                {
                                    question: flag ? url.summary : url?.pdf_url,
                                    isUser: false,
                                    filename: null,
                                    type: flag ? 'text' : 'application/pdf',
                                    file: true,
                                },
                                {
                                    question: url?.audio_overview_url,
                                    isUser: false,
                                    filename: null,
                                    type: 'audio',
                                    file: true,
                                },
                            ]
                            : arr
                    )
                );

            } else {
                console.error("Failed to fetch PDF");
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsTyping(false);
        }
    };

    const addNewChat = async () => {
        if (messages[selectedIndex]?.length !== 0) {
            messages.push([]);
            setSelectedIndex(messages.length - 1)
            setFile(null);
            const res = await fetch(config.BaseURL + 'restart', {
                method: 'POST',
            })
        }
    }

    const handleLogoutClick = () => {
        Swal.fire({
            title: 'Are you sure you want to logout?',
            icon: 'warning',
            fontfamily: 'Roboto',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, logout',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                navigate('/');
            }
        });
    };

    const getFileIcon = (filename) => {
        const extension = filename?.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return PdfIcon;
            case 'doc':
            case 'docx': return DocIcon;
            case 'xls':
            case 'xlsx': return ExcelIcon;
            case 'js': return JSIcon;
            case 'zip': return ZipIcon;
            default: return ImageIcon; // fallback image
        }
    };

    const handleDelete = (i) => {
        const newArray = messages.filter((_, index) => index !== i);
        setMessages(newArray);
        if (i < selectedIndex || i === selectedIndex) {
            setSelectedIndex(selectedIndex - 1)
        }
    }
   
    if (isLoading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                backgroundImage: `url(${AIImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
            }}>
                <ClipLoader color="#007ea7" size={60} />
            </div>
        );
    }

    return (
        <div className="chatbot_container" style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>


            <div className="sidebarDiv" style={{
                backgroundImage: `url(${AIImage})`,
                backgroundSize: 'cover'
            }}>
                <img src={Logo} alt="Logo" />
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
                    <li className="listItems">Home</li>
                    <li className="listItems" onClick={() => addNewChat()}>New Chat</li>
                    <li className="listItems">Settings</li>

                    {messages[0]?.length > 0 && <li className="listItems">Chat History</li>}
                    {messages.map((item, i) =>
                        item?.length !== 0 && (
                            <li className="listItems" key={i} onClick={() => setSelectedIndex(i)}>
                                History {i + 1}
                            </li>
                        )
                    )}
                </ul>
            </div>
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                boxSizing: 'border-box',
                backgroundImage: `url(${AIImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                width: '100%'
                // backgroundColor: '#1f1f48',
            }}>

                <div style={{ height: '50px', cursor: 'pointer' }} onClick={handleLogoutClick}>
                    <img src={Logout} alt="Logout" style={{ width: '30px', height: '30px', position: 'absolute', right: '15px' }} />
                </div>
                {/* Chat Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    justifyContent:"center",
                    paddingBottom: '10px'
                }}>
                    {messages[0].length === 0 ? (
                        <div style={{
                            width: "200px",
                            height: "200px",
                            background: "radial-gradient(circle,#003462 10%, #005da2 80%)",
                            color: "#ffffff",
                            fontSize: "20px",
                            borderRadius: "50%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            alignSelf: "center",
                            textAlign: "center",
                            padding: "20px",
                            fontWeight: "bold",
                        }}>
                            Hi, how can I help you?
                        </div>
                    ) : (
                        messages[selectedIndex]?.map((msg, index) => (
                            <div key={index} style={{
                                alignSelf: msg.isUser ? "flex-end" : "flex-start",
                                backgroundColor: msg.isUser ? "#d2f8d2" : "#ececec",
                                color: "#333",
                                padding: "12px",
                                borderRadius: msg?.isUser ? "15px 15px 0 15px" : "0px 15px 15px 15px" ,  // Sharp edges here
                                maxWidth: "75%",
                                wordBreak: "break-word",
                                border: "1px solid #ddd", // Keep border for separation
                            }}>
                                {/* {msg.text ? (
                                    <div>{msg.text}</div>
                                ) : msg.type === "application/pdf" ? (
                                    <a href={samplePdf} download="sample.pdf" style={{ display: 'inline-block' }}>
                                        <img
                                            src={PdfIcon}
                                            alt="Download PDF"
                                            style={{ width: "40px", height: "40px", cursor: "pointer" }}
                                        />
                                    </a>
                                ) : null} */}

                                <div style={{ marginTop: "8px" }}>
                                    {msg.type?.startsWith("image/") ? (
                                        <img
                                            src={msg.file}
                                            alt={msg.filename}
                                            style={{ width: "100%", maxWidth: "200px", height: "auto", borderRadius: "8px" }}
                                        />
                                    ) : msg.type === "application/pdf" ? (
                                        <iframe
                                            src={msg.question}
                                            title="PDF Preview"
                                            width="100%"
                                            height="600px"
                                        ></iframe>
                                    ) : msg.type === "text" || msg.type === "questions" ? (
                                        <div>{msg.question}</div>
                                    ) : msg.type === "audio" ? (
                                        msg.question && (
                                            <div>
                                                <h4>Audio Overview</h4>
                                                <audio controls>
                                                    <source src={msg.question} type="audio/mp3" />
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </div>
                                        )
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <img
                                                src={getFileIcon(msg.filename)}
                                                alt={msg.filename}
                                                style={{ width: '30px', height: '30px' }}
                                            />
                                            <span>{msg.filename}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isTyping && (
                        <div class="chat-bubble">
                            <div class="typing">
                                <div class="dot"></div>
                                <div class="dot"></div>
                                <div class="dot"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginTop: "10px",
                }}>
                    <label htmlFor="fileInput" style={{ cursor: "pointer" }}>
                        <img src={ImageIcon} alt="Upload" style={{ width: "35px", height: "35px" }} />
                    </label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        id="fileInput"
                        accept=".txt,.csv,.xls,.xlsx"
                        onChange={(e) => { setFile(e.target.files[0]); e.target.value = '' }}
                        style={{ display: "none" }}
                    />
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => {
                            setQuestion(e.target.value);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && question !== '' && handleSendData()}
                        placeholder="Ask Anything..."
                        style={{
                            flex: 1,
                            minWidth: "180px",
                            height: "48px",
                            borderRadius: "10px",
                            padding: "0 12px",
                            border: "1px solid #ccc",
                            fontSize: "16px",
                            outline: "none",
                        }}
                    />
                    <button onClick={startListening} title="Speak" style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <img src={AudioIcon} alt="Mic" style={{ width: "30px", height: "30px" }} />
                    </button>
                    <button onClick={handleSend} disabled={question === null} title="Send" style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <img src={sendIcon} disabled={question === null} style={{ color: "#007bff", width: '25px', height: '30px' }} />
                    </button>
                </div>
            </div>
        </div>
    );
}

