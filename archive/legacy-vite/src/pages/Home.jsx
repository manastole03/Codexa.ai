import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidV4();
    setRoomId(id);
    toast.success('Created a new room');
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error('ROOM ID & username is required');
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: { username },
    });
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') joinRoom();
  };

  return (
    <div className="landingRoot">
      <header className="codexaHeader">
        <div className="codexaBrand">
          <span className="brandDot" />
          <span className="brandText">Codexa.ai</span>
        </div>
        <nav className="codexaNav">
          <a href="#features" className="navLink">Features</a>
          <a href="http://localhost:3001/" className="ctaOutlineSmall">Open Collab Platform</a>
          <button
            className="ctaPrimarySmall"
            onClick={() => navigate('/portal')}
            aria-label="Start Coding"
          >
            Start Coding
            <svg className="iconSm" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </nav>
      </header>

      <section className="codexaHero">
        <div className="heroGrid">
          <div className="heroCopy">
            <span className="badge">Collaborative Coding • AI Assisted • Real-time</span>
            <h1 className="heroTitle">
              Code together.
              <br />
              <span className="gradientText">Solve faster.</span>
            </h1>
            <p className="heroSub">
              A developer-first platform for collaborative problem solving. Real-time editor, integrated terminal, and AI assistance—polished for hackathon demos.
            </p>
            <div className="heroActions">
              <button
                className="ctaPrimary"
                onClick={() => navigate('/portal')}
              >
                Start Coding
                <svg className="iconMd" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <a href="http://localhost:3001/" className="ctaOutline">
                Open Collab Platform
                <svg className="iconMd" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="#features" className="ctaOutline">
                Explore Features
                <svg className="iconMd" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            <div className="joinCard">
              <img className="homePageLogo" src="/codexa.png" alt="codexa-logo" />
              <h4 className="joinTitle">Join your collaborative room</h4>
              <div className="inputGroup">
                <input
                  type="text"
                  className="inputBox"
                  placeholder="ROOM ID"
                  onChange={(e) => setRoomId(e.target.value)}
                  value={roomId}
                  onKeyUp={handleInputEnter}
                />
                <input
                  type="text"
                  className="inputBox"
                  placeholder="USERNAME"
                  onChange={(e) => setUsername(e.target.value)}
                  value={username}
                  onKeyUp={handleInputEnter}
                />
                <button className="btn joinBtn" onClick={joinRoom}>Join</button>
                <span className="createInfo">
                  If you don't have an invite then create &nbsp;
                  <a onClick={createNewRoom} href="#" className="createNewBtn">new room</a>
                </span>
              </div>
            </div>
          </div>

          <div className="heroVisuals">
            <div className="uiCard">
              <div className="cardHeader">
                <span className="dot red" />
                <span className="dot amber" />
                <span className="dot green" />
                <span className="fileName">editor.js</span>
              </div>
              <pre className="codeBlock">
{`// Pair programming, real-time
function twoSum(nums, target) {
  const map = new Map()
  for (let i=0;i<nums.length;i++) {
    const c = target - nums[i]
    if (map.has(c)) return [map.get(c), i]
    map.set(nums[i], i)
  }
  return []
}

// Terminal integration
console.log(twoSum([2,7,11,15], 9)) // [0,1]`}
              </pre>
            </div>

            <div className="terminalCard">
              <div className="termTitle">terminal</div>
              <div className="termBody">
                <div className="termLine">&gt; npm run dev</div>
                <div className="termLine dim">Starting server...</div>
                <div className="termLine">Ready on http://localhost:3000</div>
                <div className="cursorRow">
                  <span className="cursorChar">_</span>
                  <span className="cursorBlink"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="featuresSection">
        <div className="featuresGrid">
          <div className="featureCard">
            <div className="featureIcon">
              <svg className="iconMd" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="featureTitle">Collaborative Coding</h3>
            <p className="featureText">Work together in real time. Share context, iterate quickly, and align on solutions.</p>
          </div>
          <div className="featureCard">
            <div className="featureIcon">
              <svg className="iconMd" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="featureTitle">AI Assistance</h3>
            <p className="featureText">Ask Codexa AI to debug and generate code with context from your room.</p>
          </div>
          <div className="featureCard">
            <div className="featureIcon">
              <svg className="iconMd" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 18l8-12 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="featureTitle">Integrated Terminal</h3>
            <p className="featureText">Run and test code inside the platform. Real-time output with simple UX.</p>
          </div>
        </div>
      </section>

      <section className="infoSection">
        <div className="infoGrid">
          <div className="infoCard">
            <h3 className="infoTitle">Open Collab Platform</h3>
            <p className="infoText">Explore the Next.js demo environment with studio tools and showcase-ready visuals. Use it alongside Codexa rooms for demos.</p>
            <a href="http://localhost:3001/" className="ctaPrimary">Open Now</a>
          </div>
          <div className="infoCard">
            <h3 className="infoTitle">How it fits</h3>
            <p className="infoText">Create rooms in Codexa.ai to collaborate, then use the Collab Platform for polished presentations. Both stay in sync and keep your flow fast.</p>
          </div>
        </div>
      </section>

      <footer className="codexaFooter">
        <p>Built for hackathons — minimal, fast, and collaborative.</p>
      </footer>
    </div>
  );
};

export default Home;
