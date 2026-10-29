import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import "./styles/variables.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import App from './App.jsx'

// "Remember Me" was off: the login only lasts until the browser is closed.
// The bv_session cookie disappears on close, so if the flag is still set
// but the cookie is gone, this is a new browser session -> sign out.
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