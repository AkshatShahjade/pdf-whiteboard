import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './WorkWindow.jsx'
import ScreenBuilder from '../roopa/screen_builder.js'

// TODO: wierd stuff. App connects to Root function in WorkWindow...

createRoot(document.getElementById('root')).render(
  
  // <StrictMode>
  //   <App />
  // </StrictMode>,

  <StrictMode>
    <ScreenBuilder/>
  </StrictMode>
)
