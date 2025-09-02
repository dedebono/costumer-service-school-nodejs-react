import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Queue from './components/Queue'
import TicketList from './components/TicketList'
import TicketForm from './components/TicketForm'
import TicketDetail from './components/TicketDetail'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Queue />} />
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/new" element={<TicketForm />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
