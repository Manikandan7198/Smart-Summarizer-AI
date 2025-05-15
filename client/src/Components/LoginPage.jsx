import { useNavigate } from 'react-router-dom';
import '../Assets/css/login.css';
import LockIcon from '../Assets/images/lock.png';
import AdminIcon from '../Assets/images/admin.png';
import LoginImage from '../Assets/images/digital-circle-circuit-blue-background-futuristic-technology.jpg';
import config from '../config.json'
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import BulletIcon from '../Assets/images/bullet-icon.svg';
import AdminImage from '../Assets/images/user-gear.png';



export default function LoginPage() {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState([]);
  const [username, setUsername] = useState();
  const [password, setPassword] = useState();
  const {
    control,
    register,
    unregister: unregisterScreenFlow,
    reset,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm();

  useEffect(() => {
    handleGetData()
  }, [])

  const handleGetData = async () => {
    try {
      const res = await fetch(config.BaseURL + 'getlogin_data', {
        method: 'GET',
      });
      if (res.ok) {
        // console.log("response",await res.json());
        setLoginData(await res.json())
      } else {
        console.error("Failed to fetch data");
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkUsername = (e) => {
    console.log('eeeeeee', e);
    if (e !== loginData[0]?.Username) {
      return "Username is invalid"
    } else {
      return null
    }
  }

  const checkPassword = (e) => {
    console.log('eeeeeee', e);
    if (e !== loginData[0]?.Password) {
      return "Password is invalid"
    } else {
      return null
    }
  }

  const onSubmit = (data) => {
    navigate("/chatbot");
    reset()
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        src={LoginImage}
        alt="Login"
        style={{
          width: '100%',
          height: '100vh',
          objectFit: 'cover',
        }}
      />
      <div className="smart-heading">
        <h1 className="heading">
          <span style={{ position: 'relative' }}>Smart</span><br /> Summarizer AI
        </h1>

        <div className="smart-heading__features">
          <p>
            <img src={BulletIcon} alt="Bullet point" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Automatically extracts and summarizes key information from uploaded files.
          </p>

          <p>
            <img src={BulletIcon} alt="Bullet point" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Generates visual flow diagrams and sample outputs for quick understanding.
          </p>

          <p>
            <img src={BulletIcon} alt="Bullet point" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
            Delivers summaries in both PDF and audio formats for flexible learning.
          </p>
        </div>
      </div>

      <form className="login-container" onSubmit={handleSubmit(onSubmit)}>
       <img src={AdminImage} style={{width:'100px',height:'100px',position:'relative',bottom:'80px'}}/>
        {/* <h1 style={{ textAlign: 'center', color: '#ffffff', fontFamily: "Poppins" }}> Login to Explore Summaries</h1> */}
        <div style={{ position: 'relative' }}>
          <input
            name="email"
            type="text"
            placeholder="Username"
            className="textBoxStyle"
            style={{
              backgroundColor:"#0c3562"
            }}
            {...register(`Username`, {
              required: {
                value: true,
                message: 'Username is required',
              },
              validate: {
                customValidation: (value) => checkUsername(value),
              },
            })}
            value={username}
            onChangeCapture={(e) => setUsername(e.target.value)}
          />
          <img
            src={AdminIcon}
            className="icon"
            style={{
              width: '25px',
              height: '25px',
              position: 'absolute',
              right: '10px',
              top: '12px',
            }}
            alt="admin icon"
          />
          {errors.Username?.type && (
            <div className="text-error">
              * {errors.Username?.message}
            </div>
          )}
          {/* {errors.Username?.type === 'customValidation' &&
            <div className="text-danger">
              {errors.Username?.message}
            </div>
          } */}
        </div>

        <div style={{ position: 'relative' }}>
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="textBoxStyle"
            {...register(`Password`, {
              required: {
                value: true,
                message: 'Password is required',
              },
              validate: {
                customValidation: (value) => checkPassword(value),
              },
            })}
            value={password}
            onChangeCapture={(e) => setPassword(e.target.value)}

          />
          <img
            src={LockIcon}
            className="icon"
            style={{
              width: '25px',
              height: '25px',
              position: 'absolute',
              right: '10px',
              top: '12px',
            }}
            alt="lock icon"
          />
          {errors.Password?.type && (
            <div className="text-error">
              * {errors.Password?.message}
            </div>
          )}
          {/* {errors.Password?.type === 'customValidation' &&
            <div className="text-danger">
              {errors.Password?.message}
            </div>
          } */}
        </div>
        <button type="submit" className="loginButton">
          Login
        </button>
      </form>
    </div>
  );
}
