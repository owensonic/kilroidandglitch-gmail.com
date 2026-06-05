(function(){
  // DOM elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 900; canvas.height = 380;
  
  let kilroidScore = 0, glitchScore = 0;
  let currentTurn = "kilroid";
  let isAnimating = false;
  let adultMode = localStorage.getItem('adultMode') === 'true';
  let geminiKey = localStorage.getItem('gemini_key') || "";
  let currentBackground = localStorage.getItem('citySkyline') || "default";
  
  const hoop = { x: canvas.width/2, y: 78, radius: 14 };
  const kilroidShootPos = { x: 140, y: canvas.height - 55 };
  const glitchShootPos = { x: canvas.width - 140, y: canvas.height - 55 };
  let ball = { active: false, x: 0, y: 0 };
  
  // ---------- TRASH TALK ----------
  const normalTrash = {
    kilroid_make_dunk:["SUPER DUPER SLAM! 🌟","BOOMSHAKALAKA! 🦖","SHORT KING DUNK!"],
    kilroid_make_three:["SWISHHH! FROM DOWNTOWN!","3 POINTS OF GLORY!","TOO EASY SISTER!"],
    kilroid_miss_dunk:["OOPSIE! MY SHOE! 👟","AIRBALL LIKE A BALLOON!","TOO SHORT!"],
    kilroid_miss_three:["BONK! HIT THE BACKBOARD!","I NEED STEPSTOOL!","NYEH NEXT TIME!"],
    glitch_make_dunk:["TALL GIRL POWER SLAM! 💪","IN YOUR FACE SHORTY!","GLITCH DESTROY!"],
    glitch_make_three:["SWISH AND GIGGLE! 🥳","LONG LEGS LONG SHOT!","BOOYAH!"],
    glitch_miss_dunk:["BONK MY HEAD! 🤕","OOPSIE DAISY!","MY PONYTAIL!"],
    glitch_miss_three:["BUTTER FINGERS! 🧈","TOO FAR! NEED LADDER!","SORRY NOT SORRY"]
  };
  
  const adultTrash = {
    kilroid_make_dunk:["GET REKT, SIS! 😈","SLAM THAT WEAK DEFENSE!","BOOM! CRUSHED IT!"],
    kilroid_make_three:["DRAINED! TOO NASTY!","MONEY! 🤑","THAT'S RIGHT, WATCH AND LEARN"],
    kilroid_miss_dunk:["DANG IT! STUPID RIM!","CRAP! WHIFFED!","MY BAD... NEXT TIME BETTER"],
    kilroid_miss_three:["OH BLEEP! AIRBALL!","BRICK CITY!","FOCUS MAN!"],
    glitch_make_dunk:["SIT DOWN, LIL BRO! 🔥","TOO EASY! RESPECT MY HEIGHT","GET DUNKED ON!"],
    glitch_make_three:["BUCKETS! Y'ALL CAN'T GUARD ME","STEP BACK THREE! SPLASH","THAT'S GAME!"],
    glitch_miss_dunk:["ARE YOU KIDDING ME?!","CLANK! UGH!","I'LL GET THE NEXT ONE"],
    glitch_miss_three:["AIRBALL?! NO WAY!","THAT WAS UGLY","MY BAD, I'M RUSTY"]
  };
  
  const normalTaunt = {
    kilroid_miss: { fromGlitch: ["🍭 Shorty airball! 🍭","Hehe too small!","👖 Stepstool needed!"] },
    glitch_miss: { fromKilroid: ["🤣 Tall fail! Clumsy sis!","🎈 Big foot miss!","🦒 Too lanky to shoot!"] }
  };
  const adultTaunt = {
    kilroid_miss: { fromGlitch: ["SIT DOWN MIDGET 💀","TRASH SHOT LIL BRO","WEAK SAUCE"] },
    glitch_miss: { fromKilroid: ["LMAO TOWER OF FAIL","CLUMSY GIANT 🤡","GET REKT, TALL GIRL"] }
  };
  
  function getTrash(player, shot, success){
    let dict = adultMode ? adultTrash : normalTrash;
    let key = `${player}_${shot}_${success?'make':'miss'}`;
    let arr = dict[key] || (success ? ["Yay!"] : ["Oops!"]);
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  function getMockingTaunt(missedPlayer){
    if(missedPlayer === 'kilroid'){
      let arr = adultMode ? adultTaunt.kilroid_miss.fromGlitch : normalTaunt.kilroid_miss.fromGlitch;
      return arr[Math.floor(Math.random() * arr.length)];
    } else {
      let arr = adultMode ? adultTaunt.glitch_miss.fromKilroid : normalTaunt.glitch_miss.fromKilroid;
      return arr[Math.floor(Math.random() * arr.length)];
    }
  }
  
  function speakMessage(player, msg){
    if(!window.speechSynthesis) return;
    let utterance = new SpeechSynthesisUtterance(msg);
    utterance.rate = 0.9;
    utterance.pitch = player === 'kilroid' ? 1.65 : 1.4;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  
  function setBubble(player, msg, speak=true){
    let bubble = player === 'kilroid' ? document.getElementById('kilroidBubble') : document.getElementById('glitchBubble');
    bubble.innerHTML = `💬 ${msg} 💬`;
    if(speak) speakMessage(player, msg);
    setTimeout(()=>{ if(bubble.innerHTML.includes(msg)) bubble.innerHTML = player==='kilroid' ? "🏀 dribble 🏀" : "✨ hoop dreams ✨"; }, 2800);
  }
  
  function drawCourtAndBall(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#b97f44";
    ctx.fillRect(hoop.x-35, hoop.y-42, 70, 12);
    ctx.fillStyle = "#5e3a1e";
    ctx.fillRect(hoop.x-28, hoop.y-35, 56, 8);
    ctx.beginPath();
    ctx.arc(hoop.x, hoop.y, hoop.radius, 0, Math.PI*2);
    ctx.strokeStyle = "#ffaa33";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#e35112";
    ctx.fillRect(hoop.x-13, hoop.y+2, 26, 8);
    ctx.fillStyle = "#ff7722";
    ctx.fillRect(hoop.x-8, hoop.y+5, 16, 20);
    for(let i=0;i<12;i++){
      ctx.beginPath();
      ctx.moveTo(hoop.x+Math.sin(i)*12, hoop.y+Math.cos(i)*12+4);
      ctx.lineTo(hoop.x+Math.sin(i)*7, hoop.y+32);
      ctx.strokeStyle = "#ccc9b0";
      ctx.lineWidth=1.5;
      ctx.stroke();
    }
    if(ball.active){
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 11, 0, Math.PI*2);
      ctx.fillStyle="#ff8c42";
      ctx.fill();
      ctx.fillStyle="#4a2a1a";
      ctx.beginPath();
      ctx.moveTo(ball.x-4, ball.y-2);
      ctx.lineTo(ball.x, ball.y+5);
      ctx.lineTo(ball.x+4, ball.y-2);
      ctx.fill();
    }
  }
  
  function animateBall(shooter, shotType, success){
    if(isAnimating) return;
    isAnimating = true;
    const start = shooter === 'kilroid' ? kilroidShootPos : glitchShootPos;
    const end = { x: hoop.x, y: hoop.y + (success ? 0 : 25) };
    let startTime = performance.now();
    function step(now){
      let t = Math.min(1, (now-startTime)/520);
      let ease = 1-Math.pow(1-t,3);
      let midX = start.x + (end.x-start.x)*ease;
      let arc = -Math.sin(t*Math.PI)*55;
      let yPos = start.y + (end.y-start.y)*ease + arc;
      ball.active = true;
      ball.x = midX;
      ball.y = yPos;
      drawCourtAndBall();
      if(t<1) requestAnimationFrame(step);
      else {
        ball.active=false;
        drawCourtAndBall();
        finishShot(shooter, shotType, success);
        isAnimating=false;
      }
    }
    requestAnimationFrame(step);
  }
  
  function finishShot(shooter, shotType, success){
    let points = shotType === 'dunk' ? 2 : 3;
    if(success){
      if(shooter === 'kilroid'){
        kilroidScore += points;
        updateScores();
        setBubble('kilroid', getTrash('kilroid', shotType, true), true);
        let mocking = getMockingTaunt('kilroid');
        setBubble('glitch', `😏 ${mocking} 😏`, false);
      } else {
        glitchScore += points;
        updateScores();
        setBubble('glitch', getTrash('glitch', shotType, true), true);
        let mocking = getMockingTaunt('glitch');
        setBubble('kilroid', `😭 ${mocking} 😭`, false);
      }
      document.getElementById(shooter+'Card').classList.add('bounce-effect');
      setTimeout(()=> document.getElementById(shooter+'Card').classList.remove('bounce-effect'), 300);
    } else {
      if(shooter === 'kilroid'){
        setBubble('kilroid', getTrash('kilroid', shotType, false), true);
        let mocking = getMockingTaunt('kilroid');
        setBubble('glitch', `😂 ${mocking} 😂`, false);
      } else {
        setBubble('glitch', getTrash('glitch', shotType, false), true);
        let mocking = getMockingTaunt('glitch');
        setBubble('kilroid', `🤣 ${mocking} 🤣`, false);
      }
    }
    currentTurn = currentTurn === 'kilroid' ? 'glitch' : 'kilroid';
    updateTurnUI();
    drawCourtAndBall();
  }
  
  function updateScores(){
    document.getElementById('kilroidScore').innerText = kilroidScore;
    document.getElementById('glitchScore').innerText = glitchScore;
  }
  
  function updateTurnUI(){
    let turnDiv = document.getElementById('turnText');
    if(currentTurn === 'kilroid'){
      turnDiv.innerHTML = '🔥 KILROID\'s TURN 🔥';
      document.getElementById('kilroidCard').classList.add('active-turn');
      document.getElementById('glitchCard').classList.remove('active-turn');
    } else {
      turnDiv.innerHTML = '🌀 GLITCH\'s TURN 🌀';
      document.getElementById('glitchCard').classList.add('active-turn');
      document.getElementById('kilroidCard').classList.remove('active-turn');
    }
  }
  
  function attemptShot(type){
    if(isAnimating) return;
    let success = Math.random() < (type === 'dunk' ? 0.7 : 0.48);
    animateBall(currentTurn, type, success);
  }
  
  function setBackground(option){
    const courtDiv = document.getElementById('courtElement');
    courtDiv.classList.remove('court-bg-default');
    if(option === 'default'){
      courtDiv.style.backgroundImage = '';
      courtDiv.classList.add('court-bg-default');
      return;
    }
    let query = '';
    if(option === 'K&G University'){
      query = 'university campus ivy banner K&G letters';
    } else if(option === 'Harvard University'){
      query = 'Harvard University red brick campus ivy';
    } else {
      query = `${option} skyline cityscape at dusk vibrant`;
    }
    courtDiv.style.backgroundImage = `url('https://source.unsplash.com/featured/1600x600/?${encodeURIComponent(query)}')`;
    courtDiv.style.backgroundSize = 'cover';
    courtDiv.style.backgroundPosition = 'center 30%';
  }
  
  function applyAdultMode(){
    if(adultMode) document.body.classList.add('adult-mode');
    else document.body.classList.remove('adult-mode');
    localStorage.setItem('adultMode', adultMode);
  }
  
  // GEMINI AI
  async function callGemini(userMsg){
    if(!geminiKey){
      addChatMessage("system", "⚠️ No Gemini API key! Click gear ⚙️ and add your key.", null);
      return;
    }
    const prompt = `You are Kilroid (5yo short energetic boy) or Glitch (6yo taller sister). Answer as ONE character, very short, funny, emojis. Start with "Kilroid:" or "Glitch:". Adult mode: ${adultMode ? "ON (slightly edgy playful trash talk)" : "OFF (cute & silly)"}. User: "${userMsg}"`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Huh? I'm ballin'! 🏀";
      let character = reply.includes("Kilroid:") ? "kilroid" : (reply.includes("Glitch:") ? "glitch" : "kilroid");
      let clean = reply.replace(/^(Kilroid:|Glitch:)/i, "").trim();
      addChatMessage(character, clean);
      focusCharacterAttention(character);
      setBubble(character, clean, true);
    } catch(e){ addChatMessage("system", "AI error: check key or network", null); }
  }
  
  function addChatMessage(sender, text){
    let log = document.getElementById('chatLog');
    let div = document.createElement('div');
    if(sender === 'user'){ div.className='chat-message user'; div.innerText = `🧑 You: ${text}`; }
    else if(sender === 'kilroid'){ div.className='chat-message kilroid'; div.innerText = `🦖 Kilroid: ${text}`; }
    else if(sender === 'glitch'){ div.className='chat-message glitch'; div.innerText = `🦒 Glitch: ${text}`; }
    else { div.className='chat-message'; div.innerText = text; }
    log.appendChild(div); log.scrollTop = log.scrollHeight;
  }
  
  function focusCharacterAttention(character){
    let kil = document.getElementById('kilroidCard'), gli = document.getElementById('glitchCard');
    kil.classList.remove('focus-user'); gli.classList.remove('focus-user');
    if(character === 'kilroid') kil.classList.add('focus-user');
    else gli.classList.add('focus-user');
    setTimeout(()=>{ kil.classList.remove('focus-user'); gli.classList.remove('focus-user'); }, 1500);
  }
  
  // PHOTO GALLERY & AVATARS
  function setupPhotoGallery(){
    let strip = document.getElementById('photoStrip');
    for(let i=1;i<=4;i++){
      let div = document.createElement('div'); div.className='photo-card';
      let img = document.createElement('img'); img.src = `https://placehold.co/200x200/fdebb3/a55d2a?text=📸+${i}`;
      let upBtn = document.createElement('button'); upBtn.innerText='📷 replace'; upBtn.className='upload-btn';
      let fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*'; fileInput.style.display='none';
      upBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => { if(e.target.files[0]){ let r=new FileReader(); r.onload=(ev)=>{ img.src=ev.target.result; }; r.readAsDataURL(e.target.files[0]); } };
      div.appendChild(img); div.appendChild(upBtn); div.appendChild(fileInput); strip.appendChild(div);
    }
  }
  
  function setupAvatar(divId){
    let av = document.getElementById(divId);
    let inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.style.display='none';
    let placeholder = av.querySelector('.avatar-placeholder');
    av.onclick = () => inp.click();
    inp.onchange = (e) => { if(e.target.files[0]){ let r=new FileReader(); r.onload=(ev)=>{ let img=document.createElement('img'); img.src=ev.target.result; if(placeholder) placeholder.style.display='none'; av.innerHTML=''; av.appendChild(img); }; r.readAsDataURL(e.target.files[0]); } };
    av.appendChild(inp);
  }
  
  // EVENT LISTENERS
  document.getElementById('slamBtn').onclick = () => attemptShot('dunk');
  document.getElementById('threeBtn').onclick = () => attemptShot('three');
  document.getElementById('sendChatBtn').onclick = () => { let inp=document.getElementById('chatInput'); let msg=inp.value.trim(); if(msg){ addChatMessage('user',msg); inp.value=''; callGemini(msg); } };
  document.getElementById('clearChatBtn').onclick = () => { document.getElementById('chatLog').innerHTML=''; addChatMessage('kilroid','New chat! 🏀'); };
  if('webkitSpeechRecognition' in window){
    let recog = new webkitSpeechRecognition(); recog.continuous=false; recog.lang='en-US';
    recog.onresult=(e)=>{ document.getElementById('chatInput').value = e.results[0][0].transcript; document.getElementById('sendChatBtn').click(); };
    document.getElementById('micChatBtn').onclick = () => recog.start();
  } else { document.getElementById('micChatBtn').onclick = () => alert("Speech not supported"); }
  
  const modal = document.getElementById('settingsModal');
  document.getElementById('gearBtn').onclick = () => {
    document.getElementById('modalApiKey').value = geminiKey;
    document.getElementById('adultModeToggle').checked = adultMode;
    document.getElementById('citySelect').value = currentBackground;
    modal.style.display = 'flex';
  };
  document.getElementById('closeModalBtn').onclick = () => modal.style.display = 'none';
  document.getElementById('saveSettingsBtn').onclick = () => {
    let newKey = document.getElementById('modalApiKey').value.trim();
    if(newKey) { geminiKey = newKey; localStorage.setItem('gemini_key', newKey); }
    adultMode = document.getElementById('adultModeToggle').checked;
    let newBg = document.getElementById('citySelect').value;
    currentBackground = newBg;
    localStorage.setItem('citySkyline', currentBackground);
    applyAdultMode();
    setBackground(currentBackground);
    modal.style.display = 'none';
    alert("Settings saved! Background & adult mode updated.");
  };
  
  // INITIALIZE
  applyAdultMode();
  setBackground(currentBackground);
  updateTurnUI();
  updateScores();
  drawCourtAndBall();
  setupPhotoGallery();
  setupAvatar('kilroidAvatar');
  setupAvatar('glitchAvatar');
  setInterval(()=>{ if(!ball.active) drawCourtAndBall(); }, 60);
})();
