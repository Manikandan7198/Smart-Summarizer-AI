import { createBrowserRouter, RouterProvider } from "react-router-dom";
import './App.css';
import ChatBot from "./Components/ChatBot";
import LoginPage from "./Components/LoginPage";

function App() {
  const loginRouter = createBrowserRouter([
    {
      path: "/",
      element: <LoginPage />,
    },
    {
      path: "/chatbot",  // Ensure this matches what you're navigating to
      element: <ChatBot />,
    },
  ]);

  return (
    <div className="App">
      <RouterProvider router={loginRouter} />
    </div>
  );
}

export default App;