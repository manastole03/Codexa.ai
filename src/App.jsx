import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import Portal from './pages/Portal';
import ChatPage from './pages/ChatPage';
import { RecoilRoot } from "recoil";

function App() {

    return (
        <>
            <div>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        success: {
                            theme: {
                                primary: '#4aed88',
                            },
                        },
                    }}
                ></Toaster>
            </div>
            <BrowserRouter>
                <RecoilRoot>
                    <Routes>
                        <Route path="/" element={<Home />}></Route>
                        <Route path="/portal" element={<Portal />}></Route>
                        <Route path="/chat" element={<ChatPage />}></Route>
                        <Route path="/chat/:roomId" element={<ChatPage />}></Route>
                        <Route
                            path="/editor/:roomId"
                            element={<EditorPage />}
                        ></Route>
                    </Routes>
                </RecoilRoot>
            </BrowserRouter>
        </>
    );
}

export default App;