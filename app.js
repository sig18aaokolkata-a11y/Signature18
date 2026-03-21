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
    return db.collection('residents').orderBy('flat').get()
      .then(snapshot => {
        RESIDENTS = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by floor number (numeric) then unit letter (alpha)
        RESIDENTS.sort((a, b) => {
          const pa = a.flat.match(/^(\d+)([A-Z]*)$/i);
          const pb = b.flat.match(/^(\d+)([A-Z]*)$/i);
          if(!pa || !pb) return a.flat.localeCompare(b.flat);
          const nd = parseInt(pa[1]) - parseInt(pb[1]);
          return nd !== 0 ? nd : pa[2].localeCompare(pb[2]);
        });
        // Build ALLOWED from resident emails
        ALLOWED = new Set(RESIDENTS.map(r => (r.email||'').toLowerCase()).filter(Boolean));
        ['sig18aaokolkata@gmail.com','fm.signature18@gmail.com'].forEach(e => ALLOWED.add(e));
        // Populate flat dropdowns
        const opts = RESIDENTS.map(r => '<option value="' + r.flat + '">' + r.flat + '</option>').join('');
        ['bFlat','qFlat','payFlat','rentFlat'].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.innerHTML = '<option value="">Select flat&hellip;</option>' + opts;
        });
      })
      .catch(err => console.error('Could not load residents from Firestore:', err.code, err.message));
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

  // ── iOS scroll lock ──
  let _scrollY = 0;
  function lockBody(){
    _scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '-'+_scrollY+'px';
    document.body.style.width = '100%';
  }
  function unlockBody(){
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, _scrollY);
  }


  const fbAuth = firebase.auth();
  const db = firebase.firestore();
  const ADMIN_EMAIL = 'sig18aaokolkata@gmail.com';
  let IS_ADMIN = false;
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
    IS_ADMIN = user && user.email.toLowerCase() === ADMIN_EMAIL;
    const memGrid = document.querySelector('.mem-grid');
    if(memGrid) memGrid.classList.toggle('admin-mode', IS_ADMIN);
    const gate = document.getElementById('memberGate');
    if(gate) gate.classList.remove('show');
    const loading = document.getElementById('memberGateLoading');
    const gcont = document.getElementById('memberGateContent');
    if(loading) loading.style.display = 'none';
    if(gcont) gcont.style.display = 'none';
    const wel = document.getElementById('memWelcome');
    if(wel) wel.classList.add('show');
    if(IS_ADMIN) wel.classList.add('admin');
    const nm = document.getElementById('memWelcomeName');
    if(user && nm) nm.textContent = user.displayName || user.email.split('@')[0];
    const ph = document.getElementById('memWelcomePhoto');
    if(user && user.photoURL && ph)
      ph.outerHTML = '<img id="memWelcomePhoto" class="mem-welcome-photo" src="' + user.photoURL + '" alt=""/>';
    // Show/hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = IS_ADMIN ? '' : 'none');
    // Hide member-only elements from admin
    document.querySelectorAll('.member-only').forEach(el => el.style.display = IS_ADMIN ? 'none' : '');
    // Update resident card label
    const resCard = document.querySelector('.mc-text h4.res-card-title');
    if(resCard) resCard.textContent = IS_ADMIN ? 'Manage Residents' : 'Resident Directory';
    const hallCard = document.querySelector('.mc-text h4.hall-card-title');
    if(hallCard) hallCard.textContent = IS_ADMIN ? 'Manage Hall Bookings' : 'Book Community Hall';
    const queryCard = document.querySelector('.mc-text h4.query-card-title');
    if(queryCard) queryCard.textContent = IS_ADMIN ? 'Manage Queries' : 'Raise a Query';
    const rentCard = document.querySelector('.mc-text h4.rent-card-title');
    if(rentCard) rentCard.textContent = IS_ADMIN ? 'Manage Rent Declarations' : 'Rent Declaration';
    // Update card link labels
    document.querySelectorAll('.mc-link').forEach(el => {
      el.textContent = IS_ADMIN ? (el.dataset.adminLabel || el.dataset.memberLabel) : el.dataset.memberLabel;
    });
    // Update all card subtitles
    document.querySelectorAll('.mc-sub').forEach(el => {
      el.textContent = IS_ADMIN ? (el.dataset.admin || el.dataset.member) : el.dataset.member;
    });
    // Update modal titles for admin
    const modalTitles = {
      resModalTitle:  { member: 'Resident Directory', admin: 'Manage Residents' },
    };
    // res modal h3 — find by text since it has no id
    const resH3 = document.querySelector('#resOv h3');
    if(resH3) resH3.textContent = IS_ADMIN ? 'Manage Residents' : 'Resident Directory';

    // Update modal sub-headers for admin
    const subHeaders = {
      resHeaderSub:  { member: 'Members only · Confidential',        admin: 'View, search &amp; edit all residents' },
      bookHeaderSub: { member: 'Subject to Association approval',       admin: 'Review, approve &amp; reject requests' },
      qryHeaderSub:  { member: 'We’ll get back to you shortly',    admin: 'Respond &amp; resolve resident queries' },
      rentHeaderSub: { member: 'Mandatory intimation to Association', admin: 'Review &amp; acknowledge submissions' },
    };
    Object.entries(subHeaders).forEach(([id, texts]) => {
      const el = document.getElementById(id);
      if(el) el.innerHTML = IS_ADMIN ? texts.admin : texts.member;
    });
    // Rent modal title
    const rentH3 = document.getElementById('rentModalTitle');
    if(rentH3) rentH3.textContent = IS_ADMIN ? 'Manage Rent Declarations' : 'Rent Declaration';
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
  let _noticesRendered = false;
  function renderNotices(data){
    const grid = document.getElementById('noticeGrid');
    if(!grid) return;
    // Always replace — clear first to avoid duplicates
    grid.innerHTML = '';
    grid.innerHTML = data.map(n => {
      const urgent = n.urgent ? 'nc-urgent' : '';
      const badge = n.badge ? '<div class="nc-badge">'+n.badge+'</div>' : '';
      const date = n.date ? '<p class="nc-date">&#x1F4C5; Posted: '+n.date+'</p>' : '';
      return '<div class="nc '+urgent+' sc">'+badge+'<p class="nc-type">'+n.type+'</p><h3>'+n.title+'</h3><p>'+n.body+'</p>'+date+'</div>';
    }).join('');
    _noticesRendered = true;
  }

  // ── EVENTS ──
  let _eventsRendered = false;
  function renderEvents(data){
    const list = document.getElementById('eventList');
    if(!list) return;
    // Always replace — clear first to avoid duplicates
    list.innerHTML = '';
    list.innerHTML = data.map(e =>
      '<div class="ev-row sc"><div class="ev-dt"><div class="ev-day">'+e.day+'</div><div class="ev-mon">'+e.month+'</div></div><div class="ev-sep"></div><div class="ev-info"><h4>'+e.title+'</h4>'+(e.desc?'<p>'+e.desc+'</p>':'')+'</div>'+(e.label?'<span class="ev-tag '+(e.tag||'t-soc')+'">'+e.label+'</span>':'')+'</div>'
    ).join('');
    _eventsRendered = true;
  }

  // ── FETCH NOTICES & EVENTS from Firestore (runs once) ──
  function loadPublicNotices(){
    if(_noticesRendered) return;
    db.collection('notices').orderBy('createdAt').get()
      .then(snap=>{
        renderNotices(snap.docs.map(d=>({id:d.id,...d.data()})));
        setTimeout(()=>document.querySelectorAll('#noticeGrid .sc').forEach(el=>so.observe(el)),50);
      })
      .catch(e=>console.error('Notices load error:',e.message));
  }
  function loadPublicEvents(){
    if(_eventsRendered) return;
    db.collection('events').orderBy('createdAt').get()
      .then(snap=>{
        renderEvents(snap.docs.map(d=>({id:d.id,...d.data()})));
        setTimeout(()=>document.querySelectorAll('#eventList .sc').forEach(el=>so.observe(el)),50);
      })
      .catch(e=>console.error('Events load error:',e.message));
  }
  loadPublicNotices();
  loadPublicEvents();

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

  const hamburgerBtn = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  function closeNav(){ navLinks.classList.remove('open'); }

  hamburgerBtn.addEventListener('click', () => navLinks.classList.toggle('open'));

  // Close on any nav link click
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

  // Close on scroll
  window.addEventListener('scroll', () => { if(navLinks.classList.contains('open')) closeNav(); }, {passive:true});
  window.addEventListener('scroll',()=>{
    let c='';document.querySelectorAll('section[id]').forEach(s=>{if(window.scrollY>=s.offsetTop-90)c=s.id;});
    document.querySelectorAll('.nav-links a').forEach(a=>{a.style.color=a.getAttribute('href')==='#'+c?'#c9a233':'';});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeM();closeResidents();closeBooking();closeQuery();closePay();closeBylaws();closeEmg();closeRent();closeEditResident();closeInlineRespond();}});

  function openM(n,r,p,b){
    document.getElementById('mName').textContent=n;
    document.getElementById('mRole').textContent=r;
    const ph=document.getElementById('mPhone');ph.textContent=p;ph.style.display=p?'block':'none';
    document.getElementById('mBio').innerHTML=b;
    document.getElementById('mOv').classList.add('open');
    lockBody();
  }
  function closeM(){document.getElementById('mOv').classList.remove('open');unlockBody();}

  function openResidents(){
    document.getElementById('resOv').classList.add('open');
    lockBody();
    const h3=document.querySelector('#resOv h3');
    if(h3) h3.textContent = IS_ADMIN ? 'Manage Residents' : 'Resident Directory';
    renderResidents('');
  }
  function closeResidents(){document.getElementById('resOv').classList.remove('open');unlockBody();}
  function renderResidents(q){
    const ce=document.getElementById('resCount'),li=document.getElementById('resList');
    const f=q?RESIDENTS.filter(r=>r.flat.toLowerCase().includes(q.toLowerCase())||r.name.toLowerCase().includes(q.toLowerCase())):RESIDENTS;
    ce.textContent=f.length+' resident'+(f.length!==1?'s':'')+(q?' found':'');
    if(!f.length){li.innerHTML='<p style="text-align:center;color:#999;padding:2rem;">No results found.</p>';return;}
    li.innerHTML=f.map(r=>{
      const unsold = r.name==='Unsold';
      const editBtn = IS_ADMIN ? '<button class="res-edit-btn" onclick="openEditResident(&quot;'+r.flat+'&quot;)">&#x270E; Edit</button>' : '';
      return '<div class="res-row'+(unsold?' res-unsold':'')+'">'
        +'<div class="res-flat">'+r.flat+'</div>'
        +'<div class="res-info">'
        +'<div class="res-name">'+r.name+(unsold?' &mdash; <span style="font-size:0.72rem;font-weight:400;color:#bbb;">Not occupied</span>':'')+'</div>'
        +(unsold?''
          :(r.phone?'<div class="res-meta">&#x1F4DE; '+r.phone+'</div>':'')
          +(r.email?'<div class="res-meta">&#x2709; '+r.email+'</div>':'')
          +(r.parking?'<div class="res-meta">&#x1F17F;&#xFE0F; Parking: '+r.parking+'</div>':'')
          +(r.intercom?'<div class="res-meta">&#x260E;&#xFE0F; Intercom: '+r.intercom+'</div>':''))
        +'</div>'
        +editBtn
        +'</div>';
    }).join('');
  }

  // ── ADMIN: Edit Resident ──
  function openEditResident(flat){
    const r = RESIDENTS.find(x => x.flat === flat);
    if(!r) return;
    document.getElementById('editFlat').textContent = flat;
    document.getElementById('editName').value = r.name || '';
    document.getElementById('editPhone').value = r.phone || '';
    document.getElementById('editEmail').value = r.email || '';
    document.getElementById('editParking').value = r.parking || '';
    document.getElementById('editIntercom').value = r.intercom || '';
    document.getElementById('editStatus').textContent = '';
    document.getElementById('editResOv').classList.add('open');
    lockBody();
  }
  function closeEditResident(){
    document.getElementById('editResOv').classList.remove('open');
    unlockBody();
  }
  async function saveResident(){
    const flat = document.getElementById('editFlat').textContent;
    const btn  = document.getElementById('editSaveBtn');
    const status = document.getElementById('editStatus');
    btn.disabled = true; btn.textContent = 'Saving…';
    const updated = {
      flat,
      name:     document.getElementById('editName').value.trim(),
      phone:    document.getElementById('editPhone').value.trim(),
      email:    document.getElementById('editEmail').value.trim().toLowerCase(),
      parking:  document.getElementById('editParking').value.trim(),
      intercom: document.getElementById('editIntercom').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: fbAuth.currentUser.email
    };
    try {
      await db.collection('residents').doc(flat).update(updated);
      const idx = RESIDENTS.findIndex(x => x.flat === flat);
      if(idx > -1) RESIDENTS[idx] = { ...RESIDENTS[idx], ...updated };
      ALLOWED = new Set(RESIDENTS.map(r => (r.email||'').toLowerCase()).filter(Boolean));
      ['sig18aaokolkata@gmail.com','fm.signature18@gmail.com'].forEach(e => ALLOWED.add(e));
      status.style.color = '#2e7d32';
      status.textContent = '✅ Saved successfully!';
      btn.textContent = 'Save Changes'; btn.disabled = false;
      renderResidents(document.getElementById('resSearch').value || '');
      setTimeout(() => closeEditResident(), 1200);
    } catch(e) {
      status.style.color = '#c0392b';
      status.textContent = '❌ Save failed. Please try again.';
      btn.textContent = 'Save Changes'; btn.disabled = false;
    }
  }




  // ── SHARED: Fill owner fields from logged-in user ──
  function fillOwnerFromUser(flatId, nameId, phoneId, emailId){
    const user = fbAuth.currentUser;
    if(!user) return;
    const email = user.email.toLowerCase();
    // Use RESIDENTS if loaded, otherwise fall back to Google profile data
    const r     = RESIDENTS.find(x => (x.email||'').toLowerCase() === email);
    const name  = r ? r.name  : (user.displayName || '');
    const phone = r ? r.phone : '';
    const flat  = r ? r.flat  : '';
    if(flatId && flat){
      const flatEl = document.getElementById(flatId);
      if(flatEl){
        if(!Array.from(flatEl.options).some(o => o.value === flat)){
          const opt = document.createElement('option');
          opt.value = flat; opt.textContent = flat;
          flatEl.appendChild(opt);
        }
        flatEl.value = flat;
      }
    }
    if(nameId){  const el=document.getElementById(nameId);  if(el) el.value=name; }
    if(phoneId){ const el=document.getElementById(phoneId); if(el) el.value=phone; }
    if(emailId){ const el=document.getElementById(emailId); if(el) el.value=email; }
  }

  function autoFillOwner(flatId, nameId, phoneId, emailId){
    fillOwnerFromUser(flatId, nameId, phoneId, emailId);
  }


  // ── COMMUNITY HALL BOOKING ──
  let currentReviewId = null;

  function updateBookBtn(){
    const accept = document.getElementById('bAccept');
    const btn    = document.getElementById('bSubmitBtn');
    if(btn) btn.disabled = !(accept && accept.checked);
  }

  async function openBooking(){
    document.getElementById('bookOv').classList.add('open');
    lockBody();
    if(IS_ADMIN){
      document.getElementById('bookModalTitle').textContent = 'Manage Hall Bookings';
      document.getElementById('bookFormWrap').style.display = 'none';
      document.getElementById('bookActiveWarn').style.display = 'none';
      document.getElementById('bookSuccess').style.display = 'none';
      document.getElementById('bookHistory').style.display = 'none';
      document.getElementById('bookAdminPanel').style.display = '';
      await loadAdminBookings();
      return;
    }
    document.getElementById('bookModalTitle').textContent = 'Community Hall Booking';
    document.getElementById('bookAdminPanel').style.display = 'none';
    document.getElementById('bookSuccess').style.display = 'none';
    document.getElementById('bStatus').innerHTML = '';
    const user = fbAuth.currentUser;
    const myRes = RESIDENTS.find(r => r.email.toLowerCase() === user.email.toLowerCase());
    const myFlat = myRes ? myRes.flat : null;
    // No restriction — members can make multiple bookings
    document.getElementById('bookActiveWarn').style.display = 'none';
    document.getElementById('bookFormWrap').style.display = '';
    document.getElementById('bookHistory').style.display = 'none';
    document.getElementById('bookHistory').innerHTML = '';
    ['bName','bPhone','bEmail','bGuests','bNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const bDateEl2=document.getElementById('bDate');
    if(bDateEl2){ bDateEl2.value=''; bDateEl2.defaultValue=''; }
    const bpp=document.getElementById('bPaymentProof');if(bpp)bpp.value='';
    document.getElementById('bType').value='';
    document.getElementById('bAccept').checked=false;
    document.getElementById('bSubmitBtn').disabled=true;
    document.getElementById('bBookedNote').style.display='none';
    // Restore hidden date input if it was hidden by flatpickr
    const bDateEl = document.getElementById('bDate');
    if(bDateEl) bDateEl.style.display='';
    fillOwnerFromUser('bFlat','bName','bPhone','bEmail');
    if(myFlat) await loadBookingHistory(myFlat);
  }

  function closeBooking(){
    document.getElementById('bookOv').classList.remove('open');
    unlockBody();
  }

  async function submitBooking(){
    const flat=document.getElementById('bFlat').value, name=document.getElementById('bName').value.trim(),
          phone=document.getElementById('bPhone').value.trim(), email=document.getElementById('bEmail').value.trim(),
          date=document.getElementById('bDate').value, type=document.getElementById('bType').value,
          guests=document.getElementById('bGuests').value, notes=document.getElementById('bNotes').value.trim();
    const status=document.getElementById('bStatus'), btn=document.getElementById('bSubmitBtn');
    if(!flat||!name||!phone||!email||!date||!type||!guests){status.style.color='#c0392b';status.textContent='Please fill all required fields.';return;}
    // Date range validation
    const selectedDate = new Date(date+'T00:00:00');
    const minDate = new Date(); minDate.setHours(0,0,0,0); minDate.setDate(minDate.getDate()+7);
    const maxDate = new Date(); maxDate.setHours(0,0,0,0); maxDate.setMonth(maxDate.getMonth()+3);
    if(selectedDate < minDate){
      status.style.color='#c0392b';
      status.innerHTML='⚠️ Event date must be at least 7 days from today. Earliest: <strong>'+minDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+'</strong>.';
      return;
    }
    if(selectedDate > maxDate){
      status.style.color='#c0392b';
      status.innerHTML='⚠️ Advance booking allowed up to 3 months only. Latest: <strong>'+maxDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+'</strong>.';
      return;
    }
    if(parseInt(guests)>100){status.style.color='#c0392b';status.textContent='Maximum guest capacity is 100.';return;}
    btn.disabled=true;btn.textContent='Submitting…';
    try{
      // Convert payment proof file to base64
      let paymentProofB64='', paymentProofName='';
      const ppFile = document.getElementById('bPaymentProof').files[0];
      if(ppFile){
        paymentProofB64 = await new Promise((res,rej)=>{
          const r=new FileReader();
          r.onload=()=>res(r.result);
          r.onerror=rej;
          r.readAsDataURL(ppFile);
        });
        paymentProofName = ppFile.name;
      }
      await db.collection('hall_bookings').add({
        flat,ownerName:name,ownerPhone:phone,ownerEmail:email,
        eventDate:date,eventType:type,guestCount:parseInt(guests),notes,
        paymentProof:paymentProofB64, paymentProofName,
        status:'pending',submittedBy:fbAuth.currentUser.email,
        submittedAt:firebase.firestore.FieldValue.serverTimestamp(),
        adminNote:'',reviewedAt:null,reviewedBy:null
      });
      document.getElementById('bookFormWrap').style.display='none';
      document.getElementById('bookSuccess').style.display='';
      document.getElementById('bookHistory').style.display='none';
    }catch(e){status.style.color='#c0392b';status.textContent='Submission failed. Please try again.';btn.disabled=false;btn.textContent='Submit Request';}
  }

  async function loadBookingHistory(flat){
    const h=document.getElementById('bookHistory');
    try{
      const snap=await db.collection('hall_bookings').where('flat','==',flat).get();
      if(snap.empty){h.innerHTML='';h.style.display='none';return;}
      // Sort client-side by submittedAt desc
      const all = snap.docs.map(doc=>({id:doc.id,...doc.data()}))
        .sort((a,b)=>{
          const ta=a.submittedAt?.toMillis?.()??0;
          const tb=b.submittedAt?.toMillis?.()??0;
          return tb-ta;
        });
      const today = new Date(); today.setHours(0,0,0,0);
      const active = all.filter(d=>{
        const ev = new Date(d.eventDate+'T00:00:00');
        // Active = pending/approved AND event date is today or in the future
        return (d.status==='pending'||d.status==='approved') && ev>=today;
      });
      const past = all.filter(d=>!active.includes(d));
      let html = '<p class="book-sec" style="margin-top:1rem;">&#x1F4DC; My Bookings</p>';
      if(active.length){
        html += '<p style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:#856404;text-transform:uppercase;margin:0.5rem 0 0.3rem;">&#x23F3; Active</p>';
        html += active.map(d=>bookingHistoryRow(d)).join('');
      }
      if(past.length){
        html += '<p style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:#aab;text-transform:uppercase;margin:0.8rem 0 0.3rem;">&#x1F4CB; Past</p>';
        html += past.map(d=>bookingHistoryRow(d)).join('');
      }
      h.innerHTML = html;
      h.style.display = all.length > 0 ? '' : 'none';
    }catch(e){console.warn('History load error:',e.message);h.innerHTML='';h.style.display='none';}
  }

  function bookingHistoryRow(d){
    const isPending = d.status==='pending';
    const isApproved = d.status==='approved';
    return '<div class="booking-history-row">'
      +'<div class="bhr-info">'
      +'<span class="bhr-type">'+d.eventType+'</span>'
      +'<span class="bhr-date">&#x1F4C5; '+formatDate(d.eventDate)+'</span>'
      +(isPending?'<span class="bhr-note" style="color:#856404;">&#x23F3; Awaiting approval from Association</span>':'')
      +(isApproved?'<span class="bhr-note" style="color:#0f5132;">&#x2705; Approved — please complete payment if pending</span>':'')
      +(d.status==='rejected'&&d.adminNote?'<span class="bhr-note">&#x274C; Reason: '+d.adminNote+'</span>':'')
      +'</div>'
      +'<span class="status-pill status-'+d.status+'">'+d.status.toUpperCase()+'</span>'
      +'</div>';
  }

  async function loadAdminBookings(){
    const pDiv=document.getElementById('bookPendingList'), aDiv=document.getElementById('bookAllList');
    pDiv.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    aDiv.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      const snap=await db.collection('hall_bookings').orderBy('submittedAt','desc').limit(50).get();
      const all=snap.docs.map(d=>({id:d.id,...d.data()}));
      const pending=all.filter(d=>d.status==='pending');
      pDiv.innerHTML=pending.length?pending.map(d=>adminBookingCard(d)).join(''):'<p style="color:#aab;font-size:0.82rem;padding:0.5rem 0;">No pending requests.</p>';
      aDiv.innerHTML=all.length?all.map(d=>adminBookingCard(d)).join(''):'<p style="color:#aab;font-size:0.82rem;padding:0.5rem 0;">No bookings yet.</p>';
    }catch(e){pDiv.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error loading bookings.</p>';}
  }

  function adminBookingCard(d){
    const inlineForm = d.status==='pending'
      ? '<div id="book-form-'+d.id+'" style="display:none;margin-top:0.8rem;border-top:1px solid #e0e4f0;padding-top:0.8rem;">'
        +(d.paymentProof
          ? '<a href="'+d.paymentProof+'" target="_blank" style="display:inline-flex;align-items:center;gap:0.4rem;color:var(--gold);font-size:0.78rem;margin-bottom:0.6rem;text-decoration:none;">&#x1F4CE; View Payment Proof</a><br/>'
          : '<p style="color:#c0392b;font-size:0.75rem;margin-bottom:0.5rem;">&#x26A0;&#xFE0F; No payment proof uploaded</p>')
        +(d.notes ? '<p style="font-size:0.78rem;color:#3a4f7a;margin-bottom:0.6rem;"><strong>Notes:</strong> '+d.notes+'</p>' : '')
        +'<textarea placeholder="Add a note (required for rejection)..." id="book-note-'+d.id+'" rows="2" style="width:100%;border:1px solid #e0e4f0;border-radius:6px;padding:0.5rem 0.7rem;font-size:0.82rem;font-family:Outfit,sans-serif;resize:vertical;box-sizing:border-box;color:#0a1a3b;"></textarea>'
        +'<div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">'
        +'<button class="qry-submit" data-action="book-approve" data-id="'+d.id+'" style="flex:1;padding:0.45rem;font-size:0.8rem;background:#2e7d32;">&#x2705; Approve</button>'
        +'<button class="qry-submit" data-action="book-reject" data-id="'+d.id+'" style="flex:1;padding:0.45rem;font-size:0.8rem;background:#c0392b;">&#x274C; Reject</button>'
        +'<button data-action="book-toggle" data-id="'+d.id+'" style="background:none;border:1px solid #e0e4f0;border-radius:4px;padding:0.45rem 0.7rem;cursor:pointer;font-size:0.8rem;color:#aab;">&#x2715;</button>'
        +'</div>'
        +'<div id="book-status-'+d.id+'" style="font-size:0.78rem;margin-top:0.3rem;"></div>'
        +'</div>'
      : '';
    return '<div class="admin-booking-card">'
      +'<div class="abc-top"><span class="abc-flat">'+d.flat+'</span><span class="abc-type">'+d.eventType+'</span>'
      +'<span class="status-pill status-'+d.status+'">'+d.status.toUpperCase()+'</span></div>'
      +'<div class="abc-detail">'+d.ownerName+' &bull; '+d.ownerPhone+' &bull; '+formatDate(d.eventDate)+' &bull; '+d.guestCount+' guests</div>'
      +(d.adminNote?'<div class="abc-note">&#x1F4AC; '+d.adminNote+'</div>':'')
      +(d.status==='pending'?'<button class="res-edit-btn" data-action="book-toggle" data-id="'+d.id+'" style="margin-top:0.5rem;">Review &rarr;</button>':'')
      +inlineForm
      +'</div>';
  }

  function closeBookReview(){}

  function toggleBookForm(id){
    const el=document.getElementById('book-form-'+id);
    if(el) el.style.display=el.style.display==='none'?'':'none';
  }

  async function reviewBookingInline(id, action){
    const note=(document.getElementById('book-note-'+id)||{}).value?.trim()||'';
    const st=document.getElementById('book-status-'+id);
    if(action==='rejected'&&!note){if(st){st.style.color='#c0392b';st.textContent='Please add a reason for rejection.';}return;}
    if(st){st.style.color='#856404';st.textContent='Processing…';}
    try{
      await db.collection('hall_bookings').doc(id).update({
        status:action, adminNote:note,
        reviewedAt:firebase.firestore.FieldValue.serverTimestamp(),
        reviewedBy:fbAuth.currentUser.email
      });
      if(st){
        st.style.color = action==='approved' ? '#2e7d32' : '#c0392b';
        st.textContent = action==='approved' ? '✅ Approved!' : '❌ Rejected.';
      }
      setTimeout(async()=>{ await loadAdminBookings(); },1000);
    }catch(e){if(st){st.style.color='#c0392b';st.textContent='Failed: '+e.message;}}
  }

  function formatDate(s){
    if(!s) return '';
    return new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  }


  let currentQueryId = null;
  let currentQueryFilter = 'open';

  async function openQuery(){
    document.getElementById('qryOv').classList.add('open');
    lockBody();

    // Admin view
    if(IS_ADMIN){
      document.getElementById('qryModalTitle').textContent = 'Manage Queries';
      document.getElementById('qryFormWrap').style.display='none';
      document.getElementById('qrySuccess').style.display='none';
      document.getElementById('qryHistory').style.display='none';
      document.getElementById('qryAdminPanel').style.display='';
      await loadAdminQueries('open');
      return;
    }

    // Member view
    document.getElementById('qryModalTitle').textContent = 'Submit a Query';
    document.getElementById('qryAdminPanel').style.display='none';
    document.getElementById('qrySuccess').style.display='none';
    document.getElementById('qStatus').textContent='';
    ['qName','qPhone','qEmail','qSubject','qDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('qryFormWrap').style.display='';
    document.getElementById('qCategory').value='';
    document.getElementById('qPriority').value='Normal';
    autoFillOwner('qFlat','qName','qPhone','qEmail');

    // Load member's query history
    const user = fbAuth.currentUser;
    if(user) await loadMyQueries(user.email);
  }

  function closeQuery(){document.getElementById('qryOv').classList.remove('open');unlockBody();}

  function resetQuery(){
    document.getElementById('qrySuccess').style.display='none';
    document.getElementById('qryFormWrap').style.display='';
    document.getElementById('qStatus').textContent='';
    ['qName','qPhone','qEmail','qSubject','qDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('qCategory').value='';
    document.getElementById('qPriority').value='Normal';
    autoFillOwner('qFlat','qName','qPhone','qEmail');
  }

  async function submitQuery(){
    const flat=document.getElementById('qFlat').value, name=document.getElementById('qName').value.trim(),
          phone=document.getElementById('qPhone').value.trim(), email=document.getElementById('qEmail').value.trim(),
          cat=document.getElementById('qCategory').value, pri=document.getElementById('qPriority').value,
          subj=document.getElementById('qSubject').value.trim(), desc=document.getElementById('qDesc').value.trim();
    const st=document.getElementById('qStatus'), btn=document.getElementById('qSubmitBtn');
    if(!flat||!name||!email||!cat||!subj||!desc){st.style.color='#c0392b';st.textContent='Please fill all required fields.';return;}
    btn.disabled=true; btn.textContent='Submitting…';
    try{
      await db.collection('queries').add({
        flat, ownerName:name, ownerPhone:phone, ownerEmail:email,
        category:cat, priority:pri, subject:subj, description:desc,
        status:'open', adminReply:'', resolvedNote:'',
        submittedBy:fbAuth.currentUser.email,
        submittedAt:firebase.firestore.FieldValue.serverTimestamp(),
        repliedAt:null, repliedBy:null
      });
      document.getElementById('qryFormWrap').style.display='none';
      document.getElementById('qrySuccess').style.display='';
      // Reload history to show newly submitted query
      const u=fbAuth.currentUser; if(u) await loadMyQueries(u.email);
    }catch(e){
      st.style.color='#c0392b'; st.textContent='Submission failed. Please try again.';
      btn.disabled=false; btn.textContent='Submit Query';
    }
  }

  async function loadMyQueries(email){
    const h=document.getElementById('qryHistory');
    try{
      // Fetch by submittedBy only, sort client-side to avoid composite index
      const snap=await db.collection('queries').where('submittedBy','==',email).get();
      const sorted=snap.docs.sort((a,b)=>{
        const ta=a.data().submittedAt?.toMillis?.()||0;
        const tb=b.data().submittedAt?.toMillis?.()||0;
        return tb-ta;
      }).slice(0,20);
      const fakesnap={empty:sorted.length===0,docs:sorted};
      if(fakesnap.empty){h.style.display='none';return;}
      const all=fakesnap.docs.map(d=>({id:d.id,...d.data()}));
      const open=all.filter(d=>d.status==='open');
      const resolved=all.filter(d=>d.status==='resolved');
      let html='';
      if(open.length){
        html+='<p class="qry-sec" style="margin-top:0;">&#x1F7E1; Raised Queries</p>';
        html+=open.map(d=>myQueryRow(d)).join('');
      }
      if(resolved.length){
        html+='<p class="qry-sec" style="margin-top:1rem;">&#x2705; Resolved</p>';
        html+=resolved.map(d=>myQueryRow(d)).join('');
      }
      h.innerHTML=html;
      h.style.display='';
    }catch(e){console.error('loadMyQueries:',e.message);h.innerHTML='<p style="color:#c0392b;font-size:0.8rem;padding:0.5rem;">Could not load query history.</p>';h.style.display='';}
  }

  function myQueryRow(d){
    return '<div class="booking-history-row" style="flex-direction:column;align-items:flex-start;gap:0.4rem;">'      +'<div style="display:flex;justify-content:space-between;width:100%;align-items:center;">'      +'<span style="font-size:0.85rem;font-weight:600;color:#0a1a3b;">'+d.subject+'</span>'      +'<span class="status-pill status-'+d.status+'">'+d.status.toUpperCase()+'</span>'      +'</div>'      +'<span style="font-size:0.72rem;color:#aab;">'+d.category+' &bull; '+d.priority+'</span>'      +(d.adminReply?'<div style="background:#f0f8f0;border-left:3px solid #2e7d32;padding:0.5rem 0.8rem;border-radius:0 4px 4px 0;font-size:0.8rem;color:#1a4a2a;margin-top:0.2rem;width:100%;box-sizing:border-box;">&#x1F4AC; <strong>Admin:</strong> '+d.adminReply+'</div>':'')
      +'</div>';
  }

  // ── ADMIN: Query management ──
  async function loadAdminQueries(filter){
    currentQueryFilter = filter;
    // Update filter button styles
    document.querySelectorAll('.qry-filter-btn').forEach(b=>{ b.classList.remove('active'); if(b.getAttribute('onclick') && b.getAttribute('onclick').includes("'"+filter+"'")) b.classList.add('active'); });

    const list=document.getElementById('qryAdminList');
    list.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      // Fetch all then filter client-side to avoid composite index requirement
      const snap=await db.collection('queries').orderBy('submittedAt','desc').limit(100).get();
      let all=snap.docs.map(d=>({id:d.id,...d.data()}));
      if(filter!=='all') all=all.filter(d=>d.status===filter);
      list.innerHTML=all.length?all.map(d=>adminQueryCard(d)).join(''):'<p style="color:#aab;font-size:0.82rem;padding:0.5rem 0;">No queries found.</p>';
    }catch(e){
      console.error('loadAdminQueries error:',e);
      list.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error: '+e.message+'</p>';
    }
  }

  function filterQueries(f){ loadAdminQueries(f); }

  function adminQueryCard(d){
    const urgentBorder = d.priority==='Urgent' ? 'border-left:3px solid #c0392b;' : '';
    const respondForm = d.status==='open'
      ? '<div id="respond-'+d.id+'" style="display:none;margin-top:0.8rem;border-top:1px solid #e0e4f0;padding-top:0.8rem;">'
        +'<textarea placeholder="Type your response..." id="note-'+d.id+'" rows="3" style="width:100%;border:1px solid #e0e4f0;border-radius:6px;padding:0.6rem 0.8rem;font-size:0.82rem;font-family:Outfit,sans-serif;resize:vertical;box-sizing:border-box;color:#0a1a3b;"></textarea>'
        +'<div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">'
        +'<button class="qry-submit" data-action="resolve" data-id="'+d.id+'" style="flex:1;padding:0.5rem;font-size:0.8rem;background:#2e7d32;">&#x2705; Resolve</button>'
        +'<button class="qry-submit" data-action="reply" data-id="'+d.id+'" style="flex:1;padding:0.5rem;font-size:0.8rem;background:#112354;">&#x1F4AC; Reply Only</button>'
        +'<button data-action="close" data-id="'+d.id+'" style="background:none;border:1px solid #e0e4f0;border-radius:4px;padding:0.5rem 0.8rem;cursor:pointer;font-size:0.8rem;color:#aab;">&#x2715;</button>'
        +'</div>'
        +'<div id="status-'+d.id+'" style="font-size:0.78rem;margin-top:0.3rem;"></div>'
        +'</div>'
      : '';
    return '<div class="admin-booking-card" style="'+urgentBorder+'">'
      +'<div class="abc-top">'
      +'<span class="abc-flat">'+d.flat+'</span>'
      +'<span class="abc-type">'+d.subject+'</span>'
      +'<span class="status-pill status-'+d.status+'">'+d.status.toUpperCase()+'</span>'
      +(d.priority==='Urgent' ? '<span class="status-pill" style="background:#fce4e4;color:#c0392b;">URGENT</span>' : '')
      +'</div>'
      +'<div class="abc-detail">'+d.ownerName+' &bull; '+d.flat+' &bull; '+d.category+'</div>'
      +'<div style="font-size:0.8rem;color:#3a4f7a;margin-top:0.4rem;line-height:1.5;">'+d.description+'</div>'
      +(d.adminReply ? '<div class="abc-note">&#x1F4AC; '+d.adminReply+'</div>' : '')
      +(d.status==='open' ? '<button class="res-edit-btn" data-action="toggle" data-id="'+d.id+'" style="margin-top:0.5rem;">Respond &rarr;</button>' : '')
      +respondForm
      +'</div>';
  }


  function toggleRespond(id){
    const el=document.getElementById('respond-'+id);
    if(el) el.style.display = el.style.display==='none' ? '' : 'none';
  }

  // Event delegation for query admin cards
  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-action][data-id]');
    if(!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if(action==='toggle') toggleRespond(id);
    else if(action==='resolve') updateQueryInline(id,'resolved');
    else if(action==='reply') updateQueryInline(id,'open');
    else if(action==='close') toggleRespond(id);
    else if(action==='emg-toggle') toggleEmgForm(id);
    else if(action==='emg-save') saveEmgContactInline(id);
    else if(action==='ack-toggle'){ toggleSignBtn(id); }
    else if(action==='consent-sign'){ signConsent(id, btn.dataset.title||''); }
    else if(action==='del-notice') deleteNotice(id);
    else if(action==='del-event') deleteEvent(id);
    else if(action==='book-toggle') toggleBookForm(id);
    else if(action==='book-approve') reviewBookingInline(id,'approved');
    else if(action==='book-reject') reviewBookingInline(id,'rejected');
    else if(action==='rent-toggle') toggleRentForm(id);
    else if(action==='rent-acknowledge') reviewRentInline(id,'acknowledge');
    else if(action==='rent-reject') reviewRentInline(id,'reject');

    else if(action==='consent-edit'){
      db.collection('consent_topics').doc(id).get().then(doc=>{
        if(!doc.exists) return;
        const d=doc.data();
        document.getElementById('consentEditId').value=id;
        document.getElementById('consentFormTitle').textContent='✎ Edit Topic';
        document.getElementById('consentTopicTitle').value=d.title||'';
        document.getElementById('consentTopicDesc').value=d.description||'';
        document.getElementById('consentFormBox').scrollIntoView({behavior:'smooth'});
      });
    }
    else if(action==='consent-toggle'){
      const active = btn.dataset.active==='true';
      toggleConsentActive(id, active);
    }
    else if(action==='consent-subs'){
      openConsentSubmissions(id, btn.dataset.title||'');
    }
  });

  async function updateQueryInline(id, newStatus){
    const note = (document.getElementById('note-'+id)||{}).value?.trim();
    const st = document.getElementById('status-'+id);
    if(!note){if(st){st.style.color='#c0392b';st.textContent='Please type a response.';}return;}
    if(st){st.style.color='#856404';st.textContent='Saving…';}
    try{
      await db.collection('queries').doc(id).update({
        status:newStatus, adminReply:note,
        repliedAt:firebase.firestore.FieldValue.serverTimestamp(),
        repliedBy:fbAuth.currentUser.email
      });
      if(st){st.style.color='#2e7d32';st.textContent=newStatus==='resolved'?'✅ Resolved!':'ὊC Reply sent!';}
      setTimeout(async()=>{ await loadAdminQueries(currentQueryFilter); },800);
    }catch(e){if(st){st.style.color='#c0392b';st.textContent='Failed. Try again.';}}
  }


  function openPay(){
    document.getElementById('payOv').classList.add('open');
    lockBody();
  }
  function closePay(){document.getElementById('payOv').classList.remove('open');unlockBody();}
  function copyUPI(){
    navigator.clipboard.writeText('signature18@sbi').then(()=>{
      const btn=document.querySelector('.pay-upi-copy');const orig=btn.textContent;btn.textContent='Copied!';
      setTimeout(()=>btn.textContent=orig,2000);
    }).catch(()=>alert('UPI ID: signature18@sbi'));
  }

  // ── MANAGE NOTICE BOARD ──
  async function openManageNotices(){
    document.getElementById('manageNoticesOv').classList.add('open');
    lockBody();
    resetNoticeForm();
    await loadAdminNotices();
  }
  function closeManageNotices(){document.getElementById('manageNoticesOv').classList.remove('open');unlockBody();}

  function resetNoticeForm(){
    document.getElementById('noticeEditId').value='';
    document.getElementById('noticeFormTitle').textContent='➕ Add New Notice';
    document.getElementById('noticeType').value='';
    document.getElementById('noticeBadge').value='';
    document.getElementById('noticeTitle').value='';
    document.getElementById('noticeBody').value='';
    document.getElementById('noticeDate').value='';
    document.querySelector('input[name="noticeUrgent"][value="false"]').checked=true;
    document.getElementById('noticeFormStatus').textContent='';
    document.getElementById('noticeSaveBtn').textContent='Save Notice';
  }

  function editNotice(d){
    document.getElementById('noticeEditId').value=d.id;
    document.getElementById('noticeFormTitle').textContent='✎ Edit Notice';
    const typeSel=document.getElementById('noticeType');
    if(typeSel) typeSel.value=d.type||'';
    const badgeSel=document.getElementById('noticeBadge');
    if(badgeSel) badgeSel.value=d.badge||'';
    document.getElementById('noticeTitle').value=d.title||'';
    document.getElementById('noticeBody').value=d.body||'';
    document.getElementById('noticeDate').value=d.date||'';
    const urgVal = d.urgent ? 'true' : 'false';
    document.querySelector('input[name="noticeUrgent"][value="'+urgVal+'"]').checked=true;
    document.getElementById('noticeFormBox').scrollIntoView({behavior:'smooth'});
  }

  async function saveNotice(){
    const id=document.getElementById('noticeEditId').value;
    const btn=document.getElementById('noticeSaveBtn');
    const st=document.getElementById('noticeFormStatus');
    const type=document.getElementById('noticeType').value.trim();
    const title=document.getElementById('noticeTitle').value.trim();
    const body=document.getElementById('noticeBody').value.trim();
    if(!type||!title||!body){st.style.color='#c0392b';st.textContent='Type, title and body are required.';return;}
    btn.disabled=true;btn.textContent='Saving…';
    const data={
      type,
      badge:document.getElementById('noticeBadge').value.trim(),
      title,
      body,
      date:document.getElementById('noticeDate').value.trim(),
      urgent:document.querySelector('input[name="noticeUrgent"]:checked').value==='true',
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    try{
      if(id) await db.collection('notices').doc(id).update(data);
      else await db.collection('notices').add({...data,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      st.style.color='#2e7d32';st.textContent=id?'✅ Updated!':'✅ Notice added!';
      btn.disabled=false;btn.textContent='Save Notice';
      resetNoticeForm();
      await loadAdminNotices();
      // Refresh live notice board from Firestore
      _noticesRendered=false; db.collection('notices').orderBy('createdAt').get().then(s=>{renderNotices(s.docs.map(d=>({id:d.id,...d.data()})));});
    }catch(e){st.style.color='#c0392b';st.textContent='Save failed.';btn.disabled=false;btn.textContent='Save Notice';}
  }

  async function deleteNotice(id){
    if(!confirm('Delete this notice?')) return;
    try{
      await db.collection('notices').doc(id).delete();
      await loadAdminNotices();
      _noticesRendered=false; db.collection('notices').orderBy('createdAt').get().then(s=>{renderNotices(s.docs.map(d=>({id:d.id,...d.data()})));});
    }catch(e){alert('Delete failed.');}
  }

  async function loadAdminNotices(){
    const list=document.getElementById('adminNoticeList');
    list.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      const snap=await db.collection('notices').orderBy('createdAt','desc').get();
      if(snap.empty){list.innerHTML='<p style="color:#aab;font-size:0.82rem;">No notices yet.</p>';return;}
      list.innerHTML=snap.docs.map(doc=>{
        const d={id:doc.id,...doc.data()};
        return '<div class="admin-booking-card" style="'+(d.urgent?'border-left:3px solid #c0392b;':'')+'">'
          +'<div class="abc-top">'
          +(d.badge?'<span class="status-pill" style="background:#fce4e4;color:#c0392b;">'+d.badge+'</span>':'')
          +'<span class="abc-type">'+d.title+'</span>'
          +'</div>'
          +'<div class="abc-detail">'+d.type+(d.date?' &bull; '+d.date:'')+'</div>'
          +'<div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">'
          +'<button class="res-edit-btn" onclick="editNotice('+JSON.stringify(d).replace(/"/g,'&quot;')+')" >&#x270E; Edit</button>'
          +'<button class="res-edit-btn" data-action="del-notice" data-id="'+d.id+'" style="color:#c0392b;border-color:#c0392b;">&#x1F5D1; Delete</button>'
          +'</div></div>';
      }).join('');
    }catch(e){list.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error: '+e.message+'</p>';}
  }


  // Auto-sync tag when label dropdown changes
  document.addEventListener('change', function(e){
    if(e.target.id === 'eventLabel'){
      const map = {'Community':'t-soc','Festival':'t-fest','Meeting':'t-meet','Maintenance':'t-main'};
      const tag = document.getElementById('eventTag');
      if(tag && map[e.target.value]) tag.value = map[e.target.value];
    }
    if(e.target.id === 'eventTag'){
      const map = {'t-soc':'Community','t-fest':'Festival','t-meet':'Meeting','t-main':'Maintenance'};
      const label = document.getElementById('eventLabel');
      if(label && map[e.target.value]) label.value = map[e.target.value];
    }
  });

  // ── MANAGE EVENTS ──
  async function openManageEvents(){
    document.getElementById('manageEventsOv').classList.add('open');
    lockBody();
    resetEventForm();
    await loadAdminEvents();
  }
  function closeManageEvents(){document.getElementById('manageEventsOv').classList.remove('open');unlockBody();}

  function resetEventForm(){
    document.getElementById('eventEditId').value='';
    document.getElementById('eventFormTitle').textContent='➕ Add New Event';
    ['eventDay','eventMonth','eventTitle','eventDesc','eventLabel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('eventTag').value='t-soc';
    document.getElementById('eventFormStatus').textContent='';
    document.getElementById('eventSaveBtn').textContent='Save Event';
  }

  function editEvent(d){
    document.getElementById('eventEditId').value=d.id;
    document.getElementById('eventFormTitle').textContent='✎ Edit Event';
    document.getElementById('eventDay').value=d.day||'';
    document.getElementById('eventMonth').value=d.month||'';
    document.getElementById('eventTitle').value=d.title||'';
    document.getElementById('eventDesc').value=d.desc||'';
    document.getElementById('eventTag').value=d.tag||'t-soc';
    document.getElementById('eventLabel').value=d.label||'';
    document.getElementById('eventFormBox').scrollIntoView({behavior:'smooth'});
  }

  async function saveEvent(){
    const id=document.getElementById('eventEditId').value;
    const btn=document.getElementById('eventSaveBtn');
    const st=document.getElementById('eventFormStatus');
    const day=document.getElementById('eventDay').value.trim();
    const month=document.getElementById('eventMonth').value.trim();
    const title=document.getElementById('eventTitle').value.trim();
    if(!day||!month||!title){st.style.color='#c0392b';st.textContent='Day, month and title are required.';return;}
    btn.disabled=true;btn.textContent='Saving…';
    const data={
      day,month,title,
      desc:document.getElementById('eventDesc').value.trim(),
      tag:document.getElementById('eventTag').value,
      label:document.getElementById('eventLabel').value.trim(),
      highlight:true,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    try{
      if(id) await db.collection('events').doc(id).update(data);
      else await db.collection('events').add({...data,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      st.style.color='#2e7d32';st.textContent=id?'✅ Updated!':'✅ Event added!';
      btn.disabled=false;btn.textContent='Save Event';
      resetEventForm();
      await loadAdminEvents();
      _eventsRendered=false; db.collection('events').orderBy('createdAt').get().then(s=>{renderEvents(s.docs.map(d=>({id:d.id,...d.data()})));});
    }catch(e){st.style.color='#c0392b';st.textContent='Save failed.';btn.disabled=false;btn.textContent='Save Event';}
  }

  async function deleteEvent(id){
    if(!confirm('Delete this event?')) return;
    try{
      await db.collection('events').doc(id).delete();
      await loadAdminEvents();
      _eventsRendered=false; db.collection('events').orderBy('createdAt').get().then(s=>{renderEvents(s.docs.map(d=>({id:d.id,...d.data()})));});
    }catch(e){alert('Delete failed.');}
  }

  async function loadAdminEvents(){
    const list=document.getElementById('adminEventList');
    list.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      const snap=await db.collection('events').orderBy('createdAt','desc').get();
      if(snap.empty){list.innerHTML='<p style="color:#aab;font-size:0.82rem;">No events yet.</p>';return;}
      list.innerHTML=snap.docs.map(doc=>{
        const d={id:doc.id,...doc.data()};
        return '<div class="admin-booking-card">'
          +'<div class="abc-top">'
          +'<span class="abc-flat">'+d.day+' '+d.month+'</span>'
          +'<span class="abc-type">'+d.title+'</span>'
          +(d.label?'<span class="ev-tag '+d.tag+'" style="font-size:0.65rem;padding:0.15rem 0.5rem;">'+d.label+'</span>':'')
          +'</div>'
          +(d.desc?'<div class="abc-detail">'+d.desc+'</div>':'')
          +'<div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">'
          +'<button class="res-edit-btn" onclick="editEvent('+JSON.stringify(d).replace(/"/g,'&quot;')+')" >&#x270E; Edit</button>'
          +'<button class="res-edit-btn" data-action="del-event" data-id="'+d.id+'" style="color:#c0392b;border-color:#c0392b;">&#x1F5D1; Delete</button>'
          +'</div></div>';
      }).join('');
    }catch(e){list.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error: '+e.message+'</p>';}
  }


  // ── MEMBER: MY CONSENTS ──
  async function openConsents(){
    document.getElementById('consentsOv').classList.add('open');
    lockBody();
    const body = document.getElementById('consentsBody');
    body.innerHTML='<p style="color:#aab;font-size:0.82rem;text-align:center;padding:1rem;">Loading…</p>';
    try{
      const user = fbAuth.currentUser;
      const email = user.email.toLowerCase();
      const myRes = RESIDENTS.find(r=>(r.email||'').toLowerCase()===email);
      const myFlat = myRes ? myRes.flat : '';
      const myName = myRes ? myRes.name : (user.displayName||'');

      // Load all active topics
      const topicsSnap = await db.collection('consent_topics').get();
      const allTopics = topicsSnap.docs.map(d=>({id:d.id,...d.data()}));
      const activeTopics = allTopics.filter(t=>t.active);

      // Load this member's existing submissions
      const subSnap = await db.collection('consent_submissions').where('ownerEmail','==',email).get();
      const signedTopicIds = new Set(subSnap.docs.map(d=>d.data().topicId));

      const pending = activeTopics.filter(t=>!signedTopicIds.has(t.id));
      const signed  = activeTopics.filter(t=>signedTopicIds.has(t.id));
      // Also include inactive topics that were signed
      const inactiveSigned = allTopics.filter(t=>!t.active && signedTopicIds.has(t.id));

      let html = '';

      if(pending.length){
        html += '<div class="consent-section-label">&#x23F3; Pending — Action Required</div>';
        pending.forEach(t=>{
          html += '<div class="consent-item pending" id="ci-'+t.id+'">'
            +'<div class="consent-title">'+t.title+'</div>'
            +'<div class="consent-desc">'+t.description+'</div>'
            +'<label class="consent-ack"><input type="checkbox" id="ack-'+t.id+'" data-action="ack-toggle" data-id="'+t.id+'"/>'
            +'I have read and understood the above, and acknowledge my responsibility accordingly.</label>'
            +'<button class="consent-sign-btn" id="signBtn-'+t.id+'" disabled data-action="consent-sign" data-id="'+t.id+'" data-title="'+encodeURIComponent(t.title)+'">'
            +'&#x270F;&#xFE0F; Sign &amp; Acknowledge</button>'
            +'<div id="signStatus-'+t.id+'" style="font-size:0.78rem;margin-top:0.4rem;"></div>'
            +'</div>';
        });
      }

      if(signed.length || inactiveSigned.length){
        html += '<div class="consent-section-label" style="margin-top:'+(pending.length?'1.5rem':'0')+';">&#x2705; Previously Acknowledged</div>';
        [...signed,...inactiveSigned].forEach(t=>{
          const sub = subSnap.docs.find(d=>d.data().topicId===t.id);
          const signedAt = sub && sub.data().signedAt ? new Date(sub.data().signedAt.toDate()).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
          html += '<div class="consent-item '+(t.active?'signed':'inactive')+'">'
            +'<div class="consent-title">'+t.title+(t.active?'':'<span style="font-size:0.7rem;color:#aab;margin-left:0.5rem;">(Inactive)</span>')+'</div>'
            +'<div class="consent-signed-badge">&#x2705; Acknowledged'+(signedAt?' on '+signedAt:'')+'</div>'
            +'</div>';
        });
      }

      if(!pending.length && !signed.length && !inactiveSigned.length){
        html = '<div style="text-align:center;padding:2rem;color:#aab;"><div style="font-size:2rem;margin-bottom:0.5rem;">&#x2705;</div><p>No active consent topics at this time.</p></div>';
      }

      // Store context for signConsent
      window._consentCtx = {email, flat:myFlat, name:myName};
      body.innerHTML = html;

    }catch(e){
      console.error('openConsents error:', e.code, e.message);
      if(e.code === 'permission-denied'){
        body.innerHTML='<div style="text-align:center;padding:2rem;">'
          +'<div style="font-size:2rem;margin-bottom:0.5rem;">&#x1F512;</div>'
          +'<p style="color:#c0392b;font-size:0.85rem;font-weight:600;">Permission denied</p>'
          +'<p style="color:#aab;font-size:0.78rem;margin-top:0.4rem;">Firestore rules need to be updated.<br/>Contact the administrator.</p>'
          +'</div>';
      } else {
        body.innerHTML='<div style="text-align:center;padding:2rem;">'
          +'<div style="font-size:2rem;margin-bottom:0.5rem;">&#x26A0;&#xFE0F;</div>'
          +'<p style="color:#c0392b;font-size:0.85rem;">Could not load consents</p>'
          +'<p style="color:#aab;font-size:0.75rem;margin-top:0.3rem;">'+e.message+'</p>'
          +'</div>';
      }
    }
  }

  function closeConsents(){document.getElementById('consentsOv').classList.remove('open');unlockBody();}

  function toggleSignBtn(topicId){
    const cb = document.getElementById('ack-'+topicId);
    const btn = document.getElementById('signBtn-'+topicId);
    if(btn) btn.disabled = !cb.checked;
  }

  async function signConsent(topicId, topicTitle){
    topicTitle = topicTitle.includes('%') ? decodeURIComponent(topicTitle) : topicTitle;
    const btn = document.getElementById('signBtn-'+topicId);
    const st  = document.getElementById('signStatus-'+topicId);
    const ctx = window._consentCtx || {};
    btn.disabled=true; btn.textContent='Signing…';
    try{
      await db.collection('consent_submissions').add({
        topicId, topicTitle,
        flat: ctx.flat||'',
        ownerName: ctx.name||'',
        ownerEmail: ctx.email||'',
        signedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // Replace pending card with signed badge
      const card = document.getElementById('ci-'+topicId);
      if(card){
        card.className='consent-item signed';
        card.innerHTML='<div class="consent-title">'+topicTitle+'</div>'
          +'<div class="consent-signed-badge">&#x2705; Acknowledged just now</div>';
      }
    }catch(e){
      btn.disabled=false; btn.textContent='&#x270F;&#xFE0F; Sign & Acknowledge';
      if(st){st.style.color='#c0392b';st.textContent='Failed. Please try again.';}
    }
  }

  // ── ADMIN: MANAGE CONSENTS ──
  async function openManageConsents(){
    document.getElementById('manageConsentsOv').classList.add('open');
    lockBody();
    resetConsentForm();
    await loadAdminConsents();
  }
  function closeManageConsents(){document.getElementById('manageConsentsOv').classList.remove('open');unlockBody();}

  function resetConsentForm(){
    document.getElementById('consentEditId').value='';
    document.getElementById('consentFormTitle').textContent='➕ Add New Consent Topic';
    document.getElementById('consentTopicTitle').value='';
    document.getElementById('consentTopicDesc').value='';
    document.getElementById('consentFormStatus').textContent='';
    document.getElementById('consentSaveBtn').textContent='Save Topic';
  }

  async function saveConsentTopic(){
    const id  = document.getElementById('consentEditId').value;
    const btn = document.getElementById('consentSaveBtn');
    const st  = document.getElementById('consentFormStatus');
    const title = document.getElementById('consentTopicTitle').value.trim();
    const desc  = document.getElementById('consentTopicDesc').value.trim();
    if(!title||!desc){st.style.color='#c0392b';st.textContent='Title and description required.';return;}
    btn.disabled=true;btn.textContent='Saving…';
    try{
      if(id){
        await db.collection('consent_topics').doc(id).update({title,description:desc,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      } else {
        await db.collection('consent_topics').add({title,description:desc,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:fbAuth.currentUser.email});
      }
      st.style.color='#2e7d32';st.textContent=id?'✅ Updated!':'✅ Topic added!';
      btn.disabled=false;btn.textContent='Save Topic';
      resetConsentForm();
      await loadAdminConsents();
    }catch(e){st.style.color='#c0392b';st.textContent='Save failed.';btn.disabled=false;btn.textContent='Save Topic';}
  }

  async function toggleConsentActive(id, current){
    try{
      await db.collection('consent_topics').doc(id).update({active:!current});
      await loadAdminConsents();
    }catch(e){alert('Toggle failed.');}
  }

  async function loadAdminConsents(){
    const list = document.getElementById('adminConsentList');
    list.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      const snap = await db.collection('consent_topics').orderBy('createdAt','desc').get();
      if(snap.empty){list.innerHTML='<p style="color:#aab;font-size:0.82rem;">No topics yet.</p>';return;}
      list.innerHTML = snap.docs.map(doc=>{
        const d={id:doc.id,...doc.data()};
        return '<div class="admin-booking-card" style="'+(d.active?'border-left:3px solid #2e7d32;':'border-left:3px solid #ccc;opacity:0.7;')+'">'
          +'<div class="abc-top">'
          +'<span class="status-pill" style="background:'+(d.active?'#e8f5e9':'#f0f0f0')
          +';color:'+(d.active?'#2e7d32':'#999')+'">'+(d.active?'ACTIVE':'INACTIVE')+'</span>'
          +'<span class="abc-type">'+d.title+'</span>'
          +'</div>'
          +'<div class="abc-detail" style="font-size:0.78rem;margin-top:0.3rem;">'+d.description.substring(0,100)+(d.description.length>100?'…':'')+'</div>'
          +'<div style="display:flex;gap:0.5rem;margin-top:0.6rem;flex-wrap:wrap;">'
          +'<button class="res-edit-btn" data-action="consent-edit" data-id="'+d.id+'">&#x270E; Edit</button>'
          +'<button class="res-edit-btn" data-action="consent-toggle" data-id="'+d.id+'" data-active="'+d.active+'" style="color:'+(d.active?'#c0392b':'#2e7d32')+';border-color:'+(d.active?'#c0392b':'#2e7d32')+';">'
          +(d.active?'&#x23F8; Deactivate':'&#x25B6; Activate')+'</button>'
          +'<button class="res-edit-btn" data-action="consent-subs" data-id="'+d.id+'" data-title="'+d.title+'">&#x1F4CB; View Responses</button>'
          +'</div></div>';
      }).join('');
    }catch(e){list.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error: '+e.message+'</p>';}
  }

  async function openConsentSubmissions(topicId, topicTitle){
    // Find the card in adminConsentList and toggle inline responses
    const toggleId = 'consent-subs-'+topicId;
    let subsDiv = document.getElementById(toggleId);
    if(subsDiv){
      // Already open — toggle closed
      subsDiv.style.display = subsDiv.style.display==='none' ? '' : 'none';
      return;
    }
    // Find the card button and insert below it
    const btn = document.querySelector('[data-action="consent-subs"][data-id="'+topicId+'"]');
    if(!btn) return;
    const card = btn.closest('.admin-booking-card');
    if(!card) return;
    // Insert loading div
    subsDiv = document.createElement('div');
    subsDiv.id = toggleId;
    subsDiv.style.cssText='margin-top:0.8rem;border-top:1px solid #e0e4f0;padding-top:0.8rem;';
    subsDiv.innerHTML='<p style="color:#aab;font-size:0.78rem;">Loading responses…</p>';
    card.appendChild(subsDiv);
    try{
      const snap = await db.collection('consent_submissions').where('topicId','==',topicId).get();
      if(snap.empty){
        subsDiv.innerHTML='<p style="color:#aab;font-size:0.78rem;padding:0.3rem 0;">No acknowledgements yet.</p>';
        return;
      }
      const docs = snap.docs.map(d=>d.data()).sort((a,b)=>a.flat.localeCompare(b.flat,undefined,{numeric:true}));
      subsDiv.innerHTML='<p style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:#aab;text-transform:uppercase;margin-bottom:0.5rem;">'+docs.length+' Acknowledgement'+(docs.length!==1?'s':'')+' &mdash; '+topicTitle+'</p>'
        +docs.map(d=>{
          const dt = d.signedAt ? new Date(d.signedAt.toDate()).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid #f0f2f8;font-size:0.8rem;">'
            +'<div><span style="font-weight:700;color:#0a1a3b;min-width:3rem;display:inline-block;">'+d.flat+'</span> '+d.ownerName+'</div>'
            +'<div style="color:#aab;font-size:0.72rem;">'+dt+'</div>'
            +'</div>';
        }).join('');
    }catch(e){subsDiv.innerHTML='<p style="color:#c0392b;font-size:0.78rem;">Error: '+e.message+'</p>';}
  }
  function closeConsentSubmissions(){}  // kept for compat


  // ── PET REGISTRATION ──
  function openPetReg(){
    document.getElementById('petRegOv').classList.add('open');
    lockBody();
    document.getElementById('petRegFormWrap').style.display='';
    document.getElementById('petRegSuccess').style.display='none';
    document.getElementById('petStatus').textContent='';
    ['petOwnerName','petOwnerPhone','petOwnerEmail','petBreed','petNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); 
    document.getElementById('petSpecies').value='';
    const pd=document.getElementById('petVaccDate');if(pd)pd.value='';
    const pf=document.getElementById('petVaccFile');if(pf)pf.value='';
    const pa=document.getElementById('petAck');if(pa)pa.checked=false;
    // Populate flat dropdown
    const petFlatEl=document.getElementById('petFlat');
    if(petFlatEl && RESIDENTS.length){
      const opts=RESIDENTS.map(r=>'<option value="'+r.flat+'">'+r.flat+'</option>').join('');
      petFlatEl.innerHTML='<option value="">Select flat…</option>'+opts;
    }
    fillOwnerFromUser('petFlat','petOwnerName','petOwnerPhone','petOwnerEmail');
  }
  function closePetReg(){document.getElementById('petRegOv').classList.remove('open');unlockBody();}
  function resetPetReg(){openPetReg();}

  async function submitPetReg(){
    const flat=document.getElementById('petFlat').value;
    const ownerName=document.getElementById('petOwnerName').value.trim();
    const ownerPhone=document.getElementById('petOwnerPhone').value.trim();
    const ownerEmail=document.getElementById('petOwnerEmail').value.trim();
    const species=document.getElementById('petSpecies').value;
    const ack=document.getElementById('petAck').checked;
    const st=document.getElementById('petStatus');
    const btn=document.getElementById('petSubmitBtn');
    if(!flat||!ownerName||!ownerPhone||!ownerEmail||!species){
      st.style.color='#c0392b';st.textContent='Please fill all required fields.';return;
    }
    if(!ack){st.style.color='#c0392b';st.textContent='Please confirm the declaration.';return;}
    const vaccFile=document.getElementById('petVaccFile').files[0];
    if(!vaccFile){st.style.color='#c0392b';st.textContent='Please upload the vaccination certificate.';return;}
    btn.disabled=true;btn.textContent='Registering…';
    try{
      let vaccB64='',vaccName='';
      vaccB64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(vaccFile);});
      vaccName=vaccFile.name;
      await db.collection('pet_registrations').add({
        flat,ownerName,ownerPhone,ownerEmail,
        species,
        breed:document.getElementById('petBreed').value.trim(),
        vaccDate:document.getElementById('petVaccDate').value,
        notes:document.getElementById('petNotes').value.trim(),
        vaccFile:vaccB64,vaccFileName:vaccName,
        status:'pending',adminNote:'',
        submittedBy:fbAuth.currentUser.email,
        submittedAt:firebase.firestore.FieldValue.serverTimestamp(),
        reviewedAt:null,reviewedBy:null
      });
      document.getElementById('petRegFormWrap').style.display='none';
      document.getElementById('petRegSuccess').style.display='';
    }catch(e){st.style.color='#c0392b';st.textContent='Registration failed. Please try again.';btn.disabled=false;btn.textContent='Register Pet';}
  }


  // ── ADMIN: MANAGE PETS ──
  let _currentPetFilter = 'pending';

  async function openManagePets(){
    document.getElementById('managePetsOv').classList.add('open');
    lockBody();
    await loadAdminPets();
  }
  function closeManagePets(){document.getElementById('managePetsOv').classList.remove('open');unlockBody();}

  async function loadAdminPets(){
    const list=document.getElementById('adminPetList');
    list.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      const snap=await db.collection('pet_registrations').orderBy('submittedAt','desc').limit(100).get();
      const all=snap.docs.map(d=>({id:d.id,...d.data()}));
      list.innerHTML=all.length
        ?'<p style="font-size:0.72rem;color:#aab;margin-bottom:0.8rem;">'+all.length+' registration'+(all.length!==1?'s':'')+' on record</p>'+all.map(d=>petCard(d)).join('')
        :'<p style="color:#aab;font-size:0.82rem;padding:0.5rem 0;">No registrations yet.</p>';
    }catch(e){list.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error: '+e.message+'</p>';}
  }

  function petCard(d){
    return '<div class="admin-booking-card">'
      +'<div class="abc-top">'
      +'<span class="abc-flat">'+d.flat+'</span>'
      +'<span class="abc-type">'+d.species+(d.breed?' &mdash; '+d.breed:'')+'</span>'
      +'</div>'
      +'<div class="abc-detail">Owner: <strong>'+d.ownerName+'</strong> &bull; '+d.ownerPhone+'</div>'
      +'<div style="display:flex;gap:1rem;margin-top:0.4rem;font-size:0.75rem;color:#7a8aaa;flex-wrap:wrap;">'
      +(d.vaccDate?'<span>&#x1F489; Last Vaccinated: '+d.vaccDate+'</span>':'<span style="color:#c0392b;">&#x26A0;&#xFE0F; No vaccination date</span>')
      +(d.vaccFile?'<a href="'+d.vaccFile+'" target="_blank" style="color:var(--gold);text-decoration:none;">&#x1F4CE; View Certificate</a>':'<span style="color:#c0392b;">&#x26A0;&#xFE0F; No certificate</span>')
      +'</div>'
      +(d.notes?'<div style="font-size:0.78rem;color:#7a8aaa;margin-top:0.3rem;">&#x1F4DD; '+d.notes+'</div>':'')
      +'</div>';
  }



  function openBylaws(){document.getElementById('bylOv').classList.add('open');lockBody();}
  function closeBylaws(){document.getElementById('bylOv').classList.remove('open');unlockBody();}

  // ── EMERGENCY CONTACTS ──
  const SECTION_LABELS = {
    building:  '&#x1F3E2; Building Contacts',
    intercom:  '&#x260E;&#xFE0F; Intercom Numbers',
    service:   '&#x1F527; Service Contacts',
    emergency: '&#x1F6A8; Emergency Services'
  };
  const EMERGENCY_SECTIONS = ['building','intercom','service','emergency'];

  async function loadEmgContacts(){
    const list = document.getElementById('emgContactList');
    if(!list) return;
    try{
      const snap = await db.collection('emergency_contacts').orderBy('order').get();
      if(snap.empty){ list.innerHTML = renderEmgFallback(); return; }
      const contacts = snap.docs.map(d=>({id:d.id,...d.data()}));
      let html = '';
      EMERGENCY_SECTIONS.forEach(sec => {
        const items = contacts.filter(c=>c.section===sec);
        if(!items.length) return;
        html += '<p class="emg-sec">'+SECTION_LABELS[sec]+'</p>';
        items.forEach(c => {
          const isRed = sec==='emergency';
          const callEl = c.type==='intercom'
            ? '<span class="emg-call">'+c.value+'</span>'
            : '<a class="emg-call'+(isRed?' red':'')+'" href="tel:'+c.value+'">&#x1F4DE; '+(isRed?c.value:'Call')+'</a>';
          const editBtn = IS_ADMIN
            ? '<button class="res-edit-btn" data-action="emg-toggle" data-id="'+c.id+'" style="margin-left:0.5rem;">&#x270E;</button>'
            : '';
          const inlineForm = IS_ADMIN
            ? '<div id="emg-form-'+c.id+'" style="display:none;width:100%;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid #e0e4f0;">'
              +'<div style="display:flex;gap:0.5rem;align-items:center;">'
              +'<input id="emg-value-'+c.id+'" type="text" value="'+c.value+'" placeholder="Number" style="flex:1;border:1px solid #e0e4f0;border-radius:4px;padding:0.4rem 0.6rem;font-size:0.82rem;"/>'
              +'<button class="qry-submit" data-action="emg-save" data-id="'+c.id+'" style="padding:0.4rem 1rem;font-size:0.8rem;white-space:nowrap;">Save</button>'
              +'<button data-action="emg-toggle" data-id="'+c.id+'" style="background:none;border:1px solid #e0e4f0;border-radius:4px;padding:0.4rem 0.7rem;font-size:0.8rem;cursor:pointer;color:#aab;">&#x2715;</button>'
              +'</div>'
              +'<span id="emg-status-'+c.id+'" style="font-size:0.75rem;display:block;margin-top:0.3rem;"></span>'
              +'</div>'
            : '';
          html += '<div class="emg-item" style="flex-wrap:wrap;">'
            +'<div class="emg-icon'+(isRed?' red':'')+'">'+c.icon+'</div>'
            +'<div class="emg-info"><div class="emg-name">'+c.name+'</div>'
            +(c.desc?'<div class="emg-desc">'+c.desc+'</div>':'')+'</div>'
            +callEl+editBtn
            +inlineForm
            +'</div>';
        });
      });
      list.innerHTML = html;
    }catch(e){ list.innerHTML = renderEmgFallback(); }
  }

  function renderEmgFallback(){
    return '<p class="emg-sec">&#x1F3E2; Building Contacts</p>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F477;</div><div class="emg-info"><div class="emg-name">Facility Manager</div><div class="emg-desc">Building operations &amp; maintenance</div></div><a class="emg-call" href="tel:+917980412140">&#x1F4DE; Call</a></div>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F6E1;</div><div class="emg-info"><div class="emg-name">Security Supervisor</div><div class="emg-desc">Building security &amp; access control</div></div><a class="emg-call" href="tel:XXXXXXXXXX">&#x1F4DE; Call</a></div>'
      +'<p class="emg-sec">&#x260E;&#xFE0F; Intercom Numbers</p>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F4DE;</div><div class="emg-info"><div class="emg-name">Reception</div></div><span class="emg-call">10</span></div>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F6AA;</div><div class="emg-info"><div class="emg-name">Security &ndash; Entry Gate</div></div><span class="emg-call">11</span></div>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F6AA;</div><div class="emg-info"><div class="emg-name">Security &ndash; Exit Gate</div></div><span class="emg-call">12</span></div>'
      +'<p class="emg-sec">&#x1F527; Service Contacts</p>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F4A7;</div><div class="emg-info"><div class="emg-name">Plumber</div></div><a class="emg-call" href="tel:XXXXXXXXXX">&#x1F4DE; Call</a></div>'
      +'<div class="emg-item"><div class="emg-icon">&#x26A1;</div><div class="emg-info"><div class="emg-name">Electrician</div></div><a class="emg-call" href="tel:XXXXXXXXXX">&#x1F4DE; Call</a></div>'
      +'<div class="emg-item"><div class="emg-icon">&#x1F9F9;</div><div class="emg-info"><div class="emg-name">Housekeeping</div><div class="emg-desc">Cleaning &amp; common area upkeep</div></div><a class="emg-call" href="tel:XXXXXXXXXX">&#x1F4DE; Call</a></div>'
      +'<p class="emg-sec">&#x1F6A8; Emergency Services</p>'
      +'<div class="emg-item"><div class="emg-icon red">&#x1F691;</div><div class="emg-info"><div class="emg-name">Ambulance</div></div><a class="emg-call red" href="tel:102">&#x1F4DE; 102</a></div>'
      +'<div class="emg-item"><div class="emg-icon red">&#x1F692;</div><div class="emg-info"><div class="emg-name">Fire Brigade</div></div><a class="emg-call red" href="tel:101">&#x1F4DE; 101</a></div>'
      +'<div class="emg-item"><div class="emg-icon red">&#x1F46E;</div><div class="emg-info"><div class="emg-name">Police</div></div><a class="emg-call red" href="tel:100">&#x1F4DE; 100</a></div>'
      +'<div class="emg-item"><div class="emg-icon red">&#x1F198;</div><div class="emg-info"><div class="emg-name">National Emergency</div></div><a class="emg-call red" href="tel:112">&#x1F4DE; 112</a></div>';
  }

  function openEmg(){document.getElementById('emgOv').classList.add('open');lockBody();loadEmgContacts();}
  function closeEmg(){document.getElementById('emgOv').classList.remove('open');unlockBody();}

  function toggleEmgForm(id){
    const el=document.getElementById('emg-form-'+id);
    if(el) el.style.display = el.style.display==='none' ? 'block' : 'none';
  }
  function closeEmgEdit(){}  // kept for escape key compat

  async function saveEmgContactInline(id){
    const value=(document.getElementById('emg-value-'+id)||{}).value?.trim();
    const st=document.getElementById('emg-status-'+id);
    if(!value){if(st){st.style.color='#c0392b';st.textContent='Please enter a number.';}return;}
    if(st){st.style.color='#856404';st.textContent='Saving…';}
    try{
      await db.collection('emergency_contacts').doc(id).update({
        value,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy:fbAuth.currentUser.email
      });
      if(st){st.style.color='#2e7d32';st.textContent='✅ Saved!';}
      setTimeout(async()=>{ await loadEmgContacts(); },800);
    }catch(e){if(st){st.style.color='#c0392b';st.textContent='Failed. Try again.';}}
  }

  let _currentRentFilter = 'pending';

  async function openRent(){
    const ov=document.getElementById('rentOv');
    if(!ov) return;
    ov.classList.add('open');
    lockBody();
    if(IS_ADMIN){
      document.getElementById('rentModalTitle').textContent = 'Manage Rent Declarations';
      document.getElementById('rentHeaderSub').textContent = 'Review & acknowledge submissions';
      document.getElementById('rentFormWrap').style.display='none';
      document.getElementById('rentSuccess').style.display='none';
      document.getElementById('rentAdminPanel').style.display='';
      await loadAdminRentDeclarations('pending');
      return;
    }
    document.getElementById('rentModalTitle').textContent = 'Rent Declaration';
    document.getElementById('rentHeaderSub').textContent = 'Mandatory intimation to Association';
    document.getElementById('rentAdminPanel').style.display='none';
    document.getElementById('rentFormWrap').style.display='';
    document.getElementById('rentSuccess').style.display='none';
    document.getElementById('rentStatus').textContent='';
    ['rentOwnerName','rentOwnerPhone','rentOwnerEmail','rentTenantName','rentTenantPhone',
     'rentTenantEmail','rentMembers','rentStartDate','rentParking','rentVehicle',
     'rentEmergency','rentNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    ['rentDuration','rentAgreement'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.value='';
    });
    document.querySelectorAll('input[name="rentPolice"]').forEach(r=>r.checked=false);
    const ra=document.getElementById('rentAck');if(ra)ra.checked=false;
    const rf=document.getElementById('rentAgreementFile');if(rf)rf.value='';
    const rentFlatEl=document.getElementById('rentFlat');
    if(rentFlatEl && RESIDENTS.length){
      const opts=RESIDENTS.map(r=>'<option value="'+r.flat+'">'+r.flat+'</option>').join('');
      rentFlatEl.innerHTML='<option value="">Select flat…</option>'+opts;
    }
    autoFillOwner('rentFlat','rentOwnerName','rentOwnerPhone','rentOwnerEmail');
  }
  function closeRent(){document.getElementById('rentOv').classList.remove('open');unlockBody();}
  function resetRent(){openRent();}

  async function submitRent(){
    const flat=document.getElementById('rentFlat').value;
    const ownerName=document.getElementById('rentOwnerName').value.trim();
    const ownerPhone=document.getElementById('rentOwnerPhone').value.trim();
    const ownerEmail=document.getElementById('rentOwnerEmail').value.trim();
    const tenantName=document.getElementById('rentTenantName').value.trim();
    const tenantPhone=document.getElementById('rentTenantPhone').value.trim();
    const members=document.getElementById('rentMembers').value;
    const startDate=document.getElementById('rentStartDate').value;
    const ack=document.getElementById('rentAck').checked;
    const st=document.getElementById('rentStatus');
    const btn=document.getElementById('rentSubmitBtn');
    if(!flat||!ownerName||!ownerPhone||!ownerEmail||!tenantName||!tenantPhone||!members||!startDate){
      st.style.color='#c0392b';st.textContent='Please fill all required fields.';return;
    }
    if(!ack){st.style.color='#c0392b';st.textContent='Please confirm the declaration.';return;}
    btn.disabled=true;btn.textContent='Submitting…';
    try{
      // Handle agreement file
      let agreementB64='',agreementName='';
      const af=document.getElementById('rentAgreementFile').files[0];
      if(af){
        agreementB64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(af);});
        agreementName=af.name;
      }
      const policeVer=(document.querySelector('input[name="rentPolice"]:checked')||{}).value||'Not specified';
      await db.collection('rent_declarations').add({
        flat,ownerName,ownerPhone,ownerEmail,
        tenantName,tenantPhone,
        tenantEmail:document.getElementById('rentTenantEmail').value.trim(),
        members:parseInt(members),startDate,
        duration:document.getElementById('rentDuration').value,
        parking:document.getElementById('rentParking').value.trim(),
        vehicle:document.getElementById('rentVehicle').value.trim(),
        agreementStatus:document.getElementById('rentAgreement').value,
        agreementFile:agreementB64,agreementFileName:agreementName,
        policeVerification:policeVer,
        emergency:document.getElementById('rentEmergency').value.trim(),
        notes:document.getElementById('rentNotes').value.trim(),
        status:'pending',adminNote:'',
        submittedBy:fbAuth.currentUser.email,
        submittedAt:firebase.firestore.FieldValue.serverTimestamp(),
        reviewedAt:null,reviewedBy:null
      });
      document.getElementById('rentFormWrap').style.display='none';
      document.getElementById('rentSuccess').style.display='';
    }catch(e){st.style.color='#c0392b';st.textContent='Submission failed. Please try again.';btn.disabled=false;btn.textContent='Submit Declaration';}
  }

  // ── ADMIN: Rent Declarations ──
  async function loadAdminRentDeclarations(filter){
    _currentRentFilter = filter;
    document.querySelectorAll('#rentAdminPanel .qry-filter-btn').forEach(b=>{
      b.classList.remove('active');
      if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+filter+"'")) b.classList.add('active');
    });
    const list=document.getElementById('rentAdminList');
    list.innerHTML='<p style="color:#aab;font-size:0.82rem;">Loading…</p>';
    try{
      const snap=await db.collection('rent_declarations').orderBy('submittedAt','desc').limit(100).get();
      let all=snap.docs.map(d=>({id:d.id,...d.data()}));
      if(filter!=='all') all=all.filter(d=>d.status===filter);
      list.innerHTML=all.length?all.map(d=>rentDeclCard(d)).join(''):'<p style="color:#aab;font-size:0.82rem;padding:0.5rem 0;">No declarations found.</p>';
    }catch(e){list.innerHTML='<p style="color:#c0392b;font-size:0.82rem;">Error: '+e.message+'</p>';}
  }

  function filterRent(f){ loadAdminRentDeclarations(f); }

  function rentDeclCard(d){
    const inlineForm = d.status==='pending'
      ? '<div id="rent-form-'+d.id+'" style="display:none;margin-top:0.8rem;border-top:1px solid #e0e4f0;padding-top:0.8rem;">'
        +'<textarea placeholder="Add a note (optional)..." id="rent-note-'+d.id+'" rows="2" style="width:100%;border:1px solid #e0e4f0;border-radius:6px;padding:0.5rem 0.7rem;font-size:0.82rem;font-family:Outfit,sans-serif;resize:vertical;box-sizing:border-box;color:#0a1a3b;"></textarea>'
        +'<div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">'
        +'<button class="qry-submit" data-action="rent-acknowledge" data-id="'+d.id+'" style="flex:1;padding:0.45rem;font-size:0.8rem;background:#2e7d32;">&#x2705; Acknowledge</button>'
        +'<button class="qry-submit" data-action="rent-reject" data-id="'+d.id+'" style="flex:1;padding:0.45rem;font-size:0.8rem;background:#c0392b;">&#x274C; Reject</button>'
        +'<button data-action="rent-toggle" data-id="'+d.id+'" style="background:none;border:1px solid #e0e4f0;border-radius:4px;padding:0.45rem 0.7rem;cursor:pointer;font-size:0.8rem;color:#aab;">&#x2715;</button>'
        +'</div>'
        +'<div id="rent-status-'+d.id+'" style="font-size:0.78rem;margin-top:0.3rem;"></div>'
        +'</div>'
      : '';
    const policeColor = d.policeVerification==='Yes' ? '#2e7d32' : '#c0392b';
    return '<div class="admin-booking-card" style="'+(d.status==='pending'?'border-left:3px solid var(--gold);':d.status==='acknowledged'?'border-left:3px solid #2e7d32;':'border-left:3px solid #c0392b;')+'">'
      +'<div class="abc-top">'
      +'<span class="abc-flat">'+d.flat+'</span>'
      +'<span class="abc-type">'+d.ownerName+'</span>'
      +'<span class="status-pill status-'+d.status+'">'+d.status.toUpperCase()+'</span>'
      +'</div>'
      +'<div class="abc-detail">Tenant: <strong>'+d.tenantName+'</strong> &bull; '+d.tenantPhone+'</div>'
      +'<div class="abc-detail">Start: '+d.startDate+(d.duration?' &bull; '+d.duration:'')+'</div>'
      +'<div style="display:flex;gap:1rem;margin-top:0.3rem;font-size:0.75rem;color:#7a8aaa;">'
      +(d.agreementStatus?'<span>&#x1F4C4; '+d.agreementStatus+'</span>':'')
      +'<span style="color:'+policeColor+'">&#x1F46E; Police: '+d.policeVerification+'</span>'
      +(d.agreementFile?'<a href="'+d.agreementFile+'" target="_blank" style="color:var(--gold);">&#x1F4CE; Agreement</a>':'')
      +'</div>'
      +(d.adminNote?'<div class="abc-note">&#x1F4AC; '+d.adminNote+'</div>':'')
      +(d.status==='pending'?'<button class="res-edit-btn" data-action="rent-toggle" data-id="'+d.id+'" style="margin-top:0.5rem;">Review &rarr;</button>':'')
      +inlineForm
      +'</div>';
  }

  async function reviewRentInline(id, action){
    const note=(document.getElementById('rent-note-'+id)||{}).value?.trim()||'';
    const st=document.getElementById('rent-status-'+id);
    if(st){st.style.color='#856404';st.textContent='Processing…';}
    try{
      await db.collection('rent_declarations').doc(id).update({
        status:action==='acknowledge'?'acknowledged':'rejected',
        adminNote:note,
        reviewedAt:firebase.firestore.FieldValue.serverTimestamp(),
        reviewedBy:fbAuth.currentUser.email
      });
      if(st){
        st.style.color=action==='acknowledge'?'#2e7d32':'#c0392b';
        st.textContent=action==='acknowledge'?'✅ Acknowledged!':'❌ Rejected.';
      }
      setTimeout(async()=>{ await loadAdminRentDeclarations(_currentRentFilter); },1000);
    }catch(e){if(st){st.style.color='#c0392b';st.textContent='Failed: '+e.message;}}
  }

  function toggleRentForm(id){
    const el=document.getElementById('rent-form-'+id);
    if(el) el.style.display=el.style.display==='none'?'':'none';
  }

  window.addEventListener('load',function(){
    const safe=(id,fn)=>{const el=document.getElementById(id);if(el)fn(el);};
    safe('resSearch',el=>el.addEventListener('input',e=>renderResidents(e.target.value)));
    safe('resOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeResidents();}));
    safe('bookOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeBooking();}));
    safe('payFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      const nameEl=document.getElementById('payName');
      if(nameEl) nameEl.value=r?r.name:'';
    }));
    safe('bFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      if(r){document.getElementById('bName').value=r.name;document.getElementById('bEmail').value=r.email;document.getElementById('bPhone').value=r.phone;}
      else{['bName','bEmail','bPhone'].forEach(id=>document.getElementById(id).value='');}
    }));
    safe('bDate',el=>el.addEventListener('change',function(){
      const ph=document.getElementById('bDatePlaceholder');
      if(ph) ph.style.display=this.value?'none':'';
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
    safe('editResOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeEditResident();}));
    safe('emgOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeEmg();}));
    safe('rentFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      if(r){document.getElementById('rentOwnerName').value=r.name;document.getElementById('rentOwnerEmail').value=r.email;document.getElementById('rentOwnerPhone').value=r.phone;}
      else{['rentOwnerName','rentOwnerEmail','rentOwnerPhone'].forEach(id=>document.getElementById(id).value='');}
    }));
    safe('mOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeM();}));
    safe('petFlat',el=>el.addEventListener('change',function(){
      const r=RESIDENTS.find(x=>x.flat===this.value);
      if(r){
        const n=document.getElementById('petOwnerName');if(n)n.value=r.name;
        const p=document.getElementById('petOwnerPhone');if(p)p.value=r.phone;
        const e=document.getElementById('petOwnerEmail');if(e)e.value=r.email;
      }
    }));
    safe('manageNoticesOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeManageNotices();}));
    safe('manageEventsOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeManageEvents();}));
    safe('petRegOv',el=>el.addEventListener('click',e=>{if(e.target===el)closePetReg();}));
    safe('managePetsOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeManagePets();}));
    safe('consentsOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeConsents();}));
    safe('manageConsentsOv',el=>el.addEventListener('click',e=>{if(e.target===el)closeManageConsents();}));
  });


