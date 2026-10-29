import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import "./styles/variables.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import App from './App.jsx'

if (
  localStorage.getItem("sessionOnly") === "1" &&
  !/(?:^|;\s*)bv_session=1/.test(document.cookie)
) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("sessionOnly");
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastContainer
      position="top-right"
      autoClose={2500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="light"
      toastClassName="bookverse-toast"
      bodyClassName="bookverse-toast-body"
      progressClassName="bookverse-progress"
    />
  </StrictMode>,
)