  const EMAILJS_PUBLIC_KEY="YOUR_PUBLIC_KEY";
  const EMAILJS_SERVICE_ID="YOUR_SERVICE_ID";
  const EMAILJS_TEMPLATE_ID="YOUR_TEMPLATE_ID";
  const EMAILJS_QUERY_TEMPLATE_ID="YOUR_QUERY_TEMPLATE_ID";
  const EMAILJS_PAY_TEMPLATE_ID="YOUR_PAY_TEMPLATE_ID";
  const SHEET_CSV_URL="YOUR_GOOGLE_SHEET_CSV_URL";
  const FIREBASE_CONFIG={
    apiKey:"AIzaSyCLLBoz7omO26827Zonb9RKLC9ovBU1MOU",
    authDomain:"signature18-fcc5c.web.app",
    projectId:"signature18-fcc5c",
    storageBucket:"signature18-fcc5c.firebasestorage.app",
    messagingSenderId:"1043699444207",
    appId:"1:1043699444207:web:890298821572a2eb6b2e1a"
  };
  // RESIDENTS — loaded only after successful login (security: not exposed on page load)
  let RESIDENTS = [];
  let ALLOWED = new Set();

  // Association emails always allowed
  ['sig18aaokolkata@gmail.com','fm.signature18@gmail.com'].forEach(e => ALLOWED.add(e));

  function loadResidents(){
    return fetch('residents.json?v=1.5')
      .then(r => r.json())
      .then(data => {
        RESIDENTS = data;
        // Build ALLOWED from resident emails
        ALLOWED = new Set(data.map(r => r.email.toLowerCase()).filter(Boolean));
        ['sig18aaokolkata@gmail.com','fm.signature18@gmail.com'].forEach(e => ALLOWED.add(e));
        // Populate flat dropdowns
        const opts = data.map(r => '<option value="' + r.flat + '">' + r.flat + '</option>').join('');
        ['bFlat','qFlat','payFlat','rentFlat'].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.innerHTML = '<option value="">Select flat&hellip;</option>' + opts;
        });
      })
      .catch(() => console.error('Could not load residents.json'));
  }

  const PROFILES = {
    am:  {name:"Dr. Abhra Mukhopadhyay (11B)",         role:"President",                                                              bio:"A doctor by profession with a strong inclination toward law — a meticulous perfectionist who has a knack for expressing his thoughts through timeless clichés. Widely respected within the Society, he brings wisdom, conviction, and a principled voice to community matters."},
    rg:  {name:"Dr. Ratnadeep Ghosh (10D)",            role:"Vice President",                                                         bio:"Known for his kind-hearted and approachable nature, he manages a demanding medical profession with remarkable ease. Yet he still holds on to his childhood fascination with tinkering with electrical components — a reflection of his hands-on curiosity and inquisitive spirit."},
    sm:  {name:"Mr. Subhajit Mukherjee (8A)",          role:"Secretary",                                                              bio:"An IT consultant by profession, adept at navigating the ever-evolving world of technology while also mastering the delicate art of pacifying passionate flat owners. Known for taking every responsibility seriously, he brings professionalism, patience, and just the right touch of diplomacy to the role. 😄"},
    rb:  {name:"Mr. Rahul Basu (13A)",                 role:"Treasurer",                                                              bio:"A marketing whiz and self-proclaimed ‘angry young man’ with a heart of gold. After a distinguished service career, he chose to be his own boss and now puts his sharp negotiation skills to work for the Association. A true food enthusiast who loves both eating and arranging a good spread."},
    sc:  {name:"Mr. Sayan Chatterjee (12A)",           role:"Manager (Communication, Technology, Games & Recreational Facilities)",   bio:"A vibrant management professional who still hasn’t lost his penchant for coding. A devoted family man who skillfully balances the joys of fatherhood with the many demands of consulting life."},
    sk:  {name:"Mr. Souvik Kumar (13C)",               role:"Manager (Communication, Specialised Maintenance Portfolio)",             bio:"A seemingly reserved management professional who turns out to be great fun once you get to know him. Passionate about long driving tours and an excellent cook, he’s just the kind of person you’d want by your side when needed."},
    btd: {name:"Mr. Bibhutosh Das (3D)",               role:"Manager (Compliance & Liaison with Grievance Committee)",               bio:"A proud retiree from a Maharatna PSU, he now spends his time juggling between karaoke renditions of old Hindi classics and animated discussions on legal and compliance matters. Whether you agree with him or not, Mr. ‘3D’ is someone who always makes his presence felt!"},
    spk: {name:"Mrs. Soma Purkayastha Kabiraj (16C)",  role:"Manager",                                                               bio:"An esteemed member of our association committee, she brings a strong sense of responsibility, professionalism, and commitment to community welfare. Known for her approachable demeanor and balanced perspective, she actively contributes to creating an inclusive and well-coordinated environment for all residents."},
    mjb: {name:"Mrs. Mousumi Jana Bhattacharya (16D)", role:"Manager",                                                               bio:"She demonstrates a commendable ability to manage responsibilities with diligence and attention to detail, playing a key role in the planning and execution of various initiatives. Her structured approach and collaborative mindset help ensure the smooth functioning of committee activities."},
    db:  {name:"Mrs. Debjani Bhowmick (15B)",          role:"Cultural Secretary",                                                    bio:"A jovial superlady whose infectious energy keeps everything moving — from household duties and motherhood to an active social life. Her positivity brings residents together, making her a natural at community bonding and a brilliant event organiser."},
  };
  function openP(key){var p=PROFILES[key];if(p)openM(p.name,p.role,"",p.bio);}

  firebase.initializeApp(FIREBASE_CONFIG);
  const fbAuth = firebase.auth();
  const gProvider = new firebase.auth.GoogleAuthProvider();
  gProvider.setCustomParameters({prompt:'select_account'});

  function doSignIn(){
    const btn = document.getElementById('memberSignInBtn');
    const err = document.getElementById('memberGateErr');
    if(btn) btn.disabled = true;
    if(err) err.classList.remove('show');
    fbAuth.signInWithPopup(gProvider)
      .then(result => processUser(result.user))
      .catch(e => {
        if(btn) btn.disabled = false;
        if(err){ err.innerHTML = 'Sign-in failed. Please try again.'; err.classList.add('show'); }
      });
  }

  function doSignOut(){
    fbAuth.signOut().then(() => window.location.reload());
  }

  function unlockMembers(user){
    const gate = document.getElementById('memberGate');
    if(gate) gate.classList.remove('show');
    const loading = document.getElementById('memberGateLoading');
    const gcont = document.getElementById('memberGateContent');
    if(loading) loading.style.display = 'none';
    if(gcont) gcont.style.display = 'none';
    const wel = document.getElementById('memWelcome');
    if(wel) wel.classList.add('show');
    const nm = document.getElementById('memWelcomeName');
    if(user && nm) nm.textContent = user.displayName || user.email.split('@')[0];
    const ph = document.getElementById('memWelcomePhoto');
    if(user && user.photoURL && ph)
      ph.outerHTML = '<img id="memWelcomePhoto" class="mem-welcome-photo" src="' + user.photoURL + '" alt=""/>';
  }

  function lockMembers(errMsg){
    const wel = document.getElementById('memWelcome');
    if(wel) wel.classList.remove('show');
    const gate = document.getElementById('memberGate');
    if(gate) gate.classList.add('show');
    const loading = document.getElementById('memberGateLoading');
    const gcont = document.getElementById('memberGateContent');
    if(loading) loading.style.display = 'none';
    if(gcont) gcont.style.display = 'flex';
    const btn = document.getElementById('memberSignInBtn');
    if(btn) btn.disabled = false;
    const err = document.getElementById('memberGateErr');
    if(err){ err.innerHTML = errMsg || ''; err.classList.toggle('show', !!errMsg); }
  }

  function processUser(user){
    if(user){
      const email = user.email.toLowerCase();
      // Load residents after login — not exposed on page load
      loadResidents().then(() => {
        if(ALLOWED.has(email)){
          unlockMembers(user);
        } else {
          fbAuth.signOut();
          lockMembers('&#x26A0;&#xFE0F; <b>' + user.email + '</b> is not registered as a resident.<br/>Contact: &ldquo;sig18aaokolkata&#64;gmail&#46;com&rdquo;');
        }
      });
    } else {
      lockMembers();
    }
  }


  // ── EMAIL / PASSWORD SIGN-IN ──
  const epProvider = new firebase.auth.EmailAuthProvider();

  function toggleEpForm(){
    const form = document.getElementById('epForm');
    const toggle = document.getElementById('epToggle');
    const isShowing = form.classList.contains('show');
    form.classList.toggle('show', !isShowing);
    toggle.style.display = isShowing ? '' : 'none';
    if(!isShowing) document.getElementById('epEmail').focus();
  }

  function doEpSignIn(){
    const email = document.getElementById('epEmail').value.trim();
    const password = document.getElementById('epPassword').value;
    const btn = document.getElementById('epSignInBtn');
    const err = document.getElementById('memberGateErr');
    if(!email || !password){
      err.innerHTML = 'Please enter your email and password.';
      err.classList.add('show');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    err.classList.remove('show');
    fbAuth.signInWithEmailAndPassword(email, password)
      .then(r => processUser(r.user))
      .catch(e => {
        btn.disabled = false;
        btn.textContent = 'Sign In';
        let msg = 'Sign-in failed. Please try again.';
        if(e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
          msg = 'Incorrect email or password.';
        else if(e.code === 'auth/invalid-email')
          msg = 'Please enter a valid email address.';
        else if(e.code === 'auth/too-many-requests')
          msg = 'Too many attempts. Please try again later.';
        err.innerHTML = msg;
        err.classList.add('show');
      });
  }

  function doForgotPassword(){
    const email = document.getElementById('epEmail').value.trim();
    const err = document.getElementById('memberGateErr');
    if(!email){
      err.innerHTML = 'Enter your email address above first.';
      err.classList.add('show');
      return;
    }
    fbAuth.sendPasswordResetEmail(email)
      .then(() => {
        err.innerHTML = '&#x2705; Password reset email sent to <b>' + email + '</b>';
        err.classList.add('show');
        err.style.color = '#4caf50';
      })
      .catch(e => {
        err.innerHTML = 'Could not send reset email. Check the address and try again.';
        err.classList.add('show');
      });
  }

  // Auto sign-out after 8 hours of inactivity
  let inactivityTimer;
  function resetInactivityTimer(){
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if(fbAuth.currentUser) fbAuth.signOut().then(() => window.location.reload());
    }, 8 * 60 * 60 * 1000);
  }
  ['click','keydown','scroll','touchstart'].forEach(e =>
    document.addEventListener(e, resetInactivityTimer, {passive:true})
  );
  resetInactivityTimer();


  // ── NOTICES ──
  function renderNotices(data){
    const grid = document.getElementById('noticeGrid');
    if(!grid) return;
    grid.innerHTML = data.map(n => {
      const urgent = n.urgent ? 'nc-urgent' : '';
      const badge = n.badge ? '<div class="nc-badge">'+n.badge+'</div>' : '';
      const date = n.date ? '<p class="nc-date">&#x1F4C5; Posted: '+n.date+'</p>' : '';
      return '<div class="nc '+urgent+' sc">'+badge+'<p class="nc-type">'+n.type+'</p><h3>'+n.title+'</h3><p>'+n.body+'</p>'+date+'</div>';
    }).join('');
  }

  // ── EVENTS ──
  function renderEvents(data){
    const list = document.getElementById('eventList'); // ev-grid
    const calGrid = document.getElementById('calGrid');
    if(!list) return;

    list.innerHTML = data.map(e =>
      '<div class="ev-row sc"><div class="ev-dt"><div class="ev-day">'+e.day+'</div><div class="ev-mon">'+e.month+'</div></div><div class="ev-sep"></div><div class="ev-info"><h4>'+e.title+'</h4>'+(e.desc?'<p>'+e.desc+'</p>':'')+'</div>'+(e.label?'<span class="ev-tag '+(e.tag||'t-soc')+'">'+e.label+'</span>':'')+'</div>'
    ).join('');

  }

  // ── FETCH NOTICES & EVENTS ──
  fetch('notices.json?v=1.5').then(r=>r.json()).then(data=>{
    renderNotices(data);
    // Trigger scroll animation on newly added cards
    setTimeout(()=>document.querySelectorAll('#noticeGrid .sc').forEach(el=>so.observe(el)),50);
  })
    .catch(()=>{ document.getElementById('noticeGrid').innerHTML='<div class="nc sc" style="color:rgba(255,255,255,0.4);padding:2rem;text-align:center;">Could not load notices.</div>'; });

  fetch('events.json?v=1.1').then(r=>r.json()).then(data=>{
    renderEvents(data);
    setTimeout(()=>document.querySelectorAll('#eventList .sc').forEach(el=>so.observe(el)),50);
  })
    .catch(()=>{ document.getElementById('eventList').innerHTML='<div class="ev-row" style="color:#aab;padding:1.2rem;">Could not load events.</div>'; });

  fbAuth.onAuthStateChanged(user => processUser(user));

  // ── GALLERY CAROUSEL ──
  (function(){
    const track   = document.getElementById('galTrack');
    const dotsBox = document.getElementById('galDots');
    const prevBtn = document.getElementById('galPrev');
    const nextBtn = document.getElementById('galNext');
    if(!track) return;

    const slides = track.querySelectorAll('.carousel-slide');
    const total  = slides.length;
    let current  = 0;
    let timer;

    // Build dots
    slides.forEach((_,i) => {
      const d = document.createElement('button');
      d.className = 'carousel-dot' + (i===0?' active':'');
      d.setAttribute('aria-label','Slide '+(i+1));
      d.addEventListener('click', () => goTo(i));
      dotsBox.appendChild(d);
    });

    function goTo(n){
      current = (n + total) % total;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dotsBox.querySelectorAll('.carousel-dot').forEach((d,i) =>
        d.classList.toggle('active', i === current)
      );
    }

    function next(){ goTo(current + 1); }
    function prev(){ goTo(current - 1); }

    function startAuto(){ timer = setInterval(next, 3000); }
    function stopAuto() { clearInterval(timer); }

    prevBtn.addEventListener('click', () => { stopAuto(); prev(); startAuto(); });
    nextBtn.addEventListener('click', () => { stopAuto(); next(); startAuto(); });

    // Pause on hover
    track.parentElement.addEventListener('mouseenter', stopAuto);
    track.parentElement.addEventListener('mouseleave', startAuto);

    // Touch/swipe support
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; stopAuto(); }, {passive:true});
    track.addEventListener('touchend',   e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if(Math.abs(diff) > 40) diff > 0 ? next() : prev();
      startAuto();
    }, {passive:true});

    startAuto();
  })();


  const ao=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');ao.unobserve(x.target);}});},{threshold:0,rootMargin:'0px 0px -20px 0px'});
  const so=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){const s=Array.from(x.target.parentElement.querySelectorAll('.sc'));setTimeout(()=>x.target.classList.add('visible'),s.indexOf(x.target)*80);so.unobserve(x.target);}});},{threshold:0,rootMargin:'0px 0px -10px 0px'});
  document.querySelectorAll('.fade-up,.fade-left,.fade-right').forEach(el=>ao.observe(el));
  // Fallback: ensure all elements become visible if observer doesn't fire
  setTimeout(()=>{
    document.querySelectorAll('.fade-up,.fade-left,.fade-right,.sc').forEach(el=>{
      if(!el.classList.contains('visible')) el.classList.add('visible');
    });
  }, 1500);

  document.querySelectorAll('.sc').forEach(el=>so.observe(el));

  document.getElementById('hamburger').addEventListener('click',()=>document.getElementById('navLinks').classList.toggle('open'));
  window.addEventListener('scroll',()=>{
    let c='';document.querySelectorAll('section[id]').forEach(s=>{if(window.scrollY>=s.offsetTop-90)c=s.id;});
    document.querySelectorAll('.nav-links a').forEach(a=>{a.style.color=a.getAttribute('href')==='#'+c?'#c9a233':'';});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeM();closeResidents();closeBooking();closeQuery();closePay();closeBylaws();closeEmg();closeRent();}});

  function openM(n,r,p,b){
    document.getElementById('mName').textContent=n;
    document.getElementById('mRole').textContent=r;
    const ph=document.getElementById('mPhone');ph.textContent=p;ph.style.display=p?'block':'none';
    document.getElementById('mBio').innerHTML=b;
    document.getElementById('mOv').classList.add('open');
    document.body.style.overflow='hidden';
  }
  function closeM(){document.getElementById('mOv').classList.remove('open');document.body.style.overflow='';}

  function openResidents(){document.getElementById('resOv').classList.add('open');document.body.style.overflow='hidden';renderResidents('');}
  function closeResidents(){document.getElementById('resOv').classList.remove('open');document.body.style.overflow='';}
  function renderResidents(q){
    const ce=document.getElementById('resCount'),li=document.getElementById('resList');
    const f=q?RESIDENTS.filter(r=>r.flat.toLowerCase().includes(q.toLowerCase())||r.name.toLowerCase().includes(q.toLowerCase())):RESIDENTS;
    ce.textContent=f.length+' resident'+(f.length!==1?'s':'')+(q?' found':'');
    if(!f.length){li.innerHTML='<p style="text-align:center;color:#999;padding:2rem;">No results found.</p>';return;}
    li.innerHTML=f.map(r=>{const unsold=r.name==='Unsold';return '<div class="res-row'+(unsold?' res-unsold':'')+'">'+'<div class="res-flat">'+r.flat+'</div>'+'<div class="res-info">'+'<div class="res-name">'+r.name+(unsold?' &mdash; <span style="font-size:0.72rem;font-weight:400;color:#bbb;">Not occupied</span>':'')+'</div>'+(unsold?'':(r.phone?'<div class="res-meta">&#x1F4DE; '+r.phone+'</div>':'')+(r.email?'<div class="res-meta">&#x2709; '+r.email+'</div>':'')+(r.parking?'<div class="res-meta">&#x1F17F;&#xFE0F; Parking: '+r.parking+'</div>':'')+(r.intercom?'<div class="res-meta">&#x260E;&#xFE0F; Intercom: '+r.intercom+'</div>':''))+'</div></div>';}).join('');
  }

  let bookedDates=[];
  async function loadBookedDates(){try{const t=await(await fetch(SHEET_CSV_URL)).text();bookedDates=t.split('\n').map(l=>l.trim().replace(/"/g,'')).filter(d=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d));}catch(e){bookedDates=[];}}

  // ── AUTO-FILL owner details from logged-in user's email ──
  function autoFillOwner(flatId, nameId, phoneId, emailId){
    const user = fbAuth.currentUser;
    if(!user || !RESIDENTS.length) return;
    const resident = RESIDENTS.find(r => r.email.toLowerCase() === user.email.toLowerCase());
    if(!resident) return;
    const flatEl = document.getElementById(flatId);
    const nameEl = document.getElementById(nameId);
    const phoneEl = document.getElementById(phoneId);
    const emailEl = document.getElementById(emailId);
    if(flatEl) flatEl.value = resident.flat;
    if(nameEl && nameId) nameEl.value = resident.name;
    if(phoneEl && phoneId) phoneEl.value = resident.phone;
    if(emailEl && emailId) emailEl.value = resident.email;
  }

  function openBooking(){
    document.getElementById('bookOv').classList.add('open');
    document.getElementById('bookFormWrap').style.display='';
    document.getElementById('bookSuccess').style.display='none';
    document.getElementById('bStatus').textContent='';
    ['bName','bPhone','bEmail','bDate','bStart','bEnd','bGuests','bParking','bNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('bType').value='';
    autoFillOwner('bFlat','bName','bPhone','bEmail');
    document.getElementById('bBookedNote').style.display='none';document.getElementById('bAccept').checked=false;
    const d=document.getElementById('bDate');
    const t=new Date();t.setDate(t.getDate()+1);d.min=t.toISOString().split('T')[0];
    const mx=new Date();mx.setFullYear(mx.getFullYear()+1);d.max=mx.toISOString().split('T')[0];
    document.body.style.overflow='hidden';loadBookedDates();
  }
  function closeBooking(){document.getElementById('bookOv').classList.remove('open');document.body.style.overflow='';}
  async function submitBooking(){}
  function downloadICS(e){e.preventDefault();}

  function openQuery(){
    document.getElementById('qryOv').classList.add('open');
    document.getElementById('qryFormWrap').style.display='';
    document.getElementById('qrySuccess').style.display='none';
    document.getElementById('qStatus').textContent='';
    ['qName','qPhone','qEmail','qSubject','qDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('qCategory').value='';document.getElementById('qPriority').value='Normal';
    autoFillOwner('qFlat','qName','qPhone','qEmail');
    document.body.style.overflow='hidden';
  }
  function closeQuery(){document.getElementById('qryOv').classList.remove('open');document.body.style.overflow='';}
  function resetQuery(){openQuery();}
  async function submitQuery(){}

  function openPay(){
    document.getElementById('payOv').classList.add('open');
    document.getElementById('payFormWrap').style.display='';
    document.getElementById('paySuccess').style.display='none';
    document.getElementById('payStatus').textContent='';
    ['payTxn','payAmt'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('payMode').value='';
    autoFillOwner('payFlat',null,null,null);
    document.querySelectorAll('#payMonthsGrid input[type=checkbox]').forEach(cb=>cb.checked=false);
    const ri=document.getElementById('payReceipt');if(ri)ri.value='';
    document.body.style.overflow='hidden';
  }
  function closePay(){document.getElementById('payOv').classList.remove('open');document.body.style.overflow='';}
  function resetPay(){openPay();}
  async function submitPayment(){}
  function copyUPI(){
    navigator.clipboard.writeText('signature18@sbi').then(()=>{
      const btn=document.querySelector('.pay-upi-copy');const orig=btn.textContent;btn.textContent='Copied!';
      setTimeout(()=>btn.textContent=orig,2000);
    }).catch(()=>alert('UPI ID: signature18@sbi'));
  }


  // ── RENT DECLARATION ──
  function openRent(){
    const ov=document.getElementById('rentOv');
    if(!ov) return;
    ov.classList.add('open');
    document.getElementById('rentFormWrap').style.display='';
    document.getElementById('rentSuccess').style.display='none';
    document.getElementById('rentStatus').textContent='';
    ['rentOwnerName','rentOwnerPhone','rentOwnerEmail','rentTenantName','rentTenantPhone',
     'rentTenantEmail','rentMembers','rentStartDate','rentParking','rentVehicle',
     'rentEmergency','rentNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    ['rentTenantType','rentDuration','rentAgreement'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.value='';
    });
    document.querySelectorAll('input[name="rentPolice"]').forEach(r=>r.checked=false);
    const ra=document.getElementById('rentAck');if(ra)ra.checked=false;
    const rf=document.getElementById('rentAgreementFile');if(rf)rf.value='';
    // Populate rentFlat from RESIDENTS
    const rentFlatEl=document.getElementById('rentFlat');
    if(rentFlatEl && RESIDENTS.length){
      const opts=RESIDENTS.map(r=>'<option value="'+r.flat+'">'+r.flat+'</option>').join('');
      rentFlatEl.innerHTML='<option value="">Select flat&hellip;</option>'+opts;
    }
    autoFillOwner('rentFlat','rentOwnerName','rentOwnerPhone','rentOwnerEmail');
    document.body.style.overflow='hidden';
  }
  function closeRent(){document.getElementById('rentOv').classList.remove('open');document.body.style.overflow='';}
  function resetRent(){openRent();}

  function openBylaws(){document.getElementById('bylOv').classList.add('open');document.body.style.overflow='hidden';}
  function closeBylaws(){document.getElementById('bylOv').classList.remove('open');document.body.style.overflow='';}

  function openEmg(){document.getElementById('emgOv').classList.add('open');document.body.style.overflow='hidden';}
  function closeEmg(){document.getElementById('emgOv').classList.remove('open');document.body.style.overflow='';}

  window.addEventListener('load',function(){
    const safe=(id,fn)=>{const el=document.getElementById(id);if(el)fn(el);};
    safe('resSearch',el=>el.addEventListener('input',e=>renderResidents(e.target.value)));
    safe('resOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeResidents();}));
    safe('bookOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeBooking();}));
    safe('bDate',el=>el.addEventListener('change',function(){document.getElementById('bBookedNote').style.display=bookedDates.includes(this.value)?'block':'none';}));
    safe('bFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      if(r){document.getElementById('bName').value=r.name;document.getElementById('bEmail').value=r.email;document.getElementById('bPhone').value=r.phone;}
      else{['bName','bEmail','bPhone'].forEach(id=>document.getElementById(id).value='');}
    }));
    safe('qryOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeQuery();}));
    safe('qFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      if(r){document.getElementById('qName').value=r.name;document.getElementById('qEmail').value=r.email;document.getElementById('qPhone').value=r.phone;}
      else{['qName','qEmail','qPhone'].forEach(id=>document.getElementById(id).value='');}
    }));
    safe('payOv',el=>el.addEventListener('click',e=>{if(e.target===el)closePay();}));
    safe('bylOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeBylaws();}));
    safe('rentOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeRent();}));
    safe('rentFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      if(r){document.getElementById('rentOwnerName').value=r.name;document.getElementById('rentOwnerEmail').value=r.email;document.getElementById('rentOwnerPhone').value=r.phone;}
      else{['rentOwnerName','rentOwnerEmail','rentOwnerPhone'].forEach(id=>document.getElementById(id).value='');}
    }));
    safe('emgOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeEmg();}));
    safe('mOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeM();}));
  });
