(function() {
  'use strict';

  // ---- Supabase ----
  var SUPABASE_URL = window.__RIDEGO_SUPABASE_URL || 'https://plpkelkbwcyuglaghsfk.supabase.co';
  var SUPABASE_KEY = window.__RIDEGO_SUPABASE_KEY || 'sb_publishable_anPF5rXktq-YMpHzihweYg_cf6VhRlq';
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  var sb = window.sb;

  // ---- Globals (for multi-page and future use) ----
  window.currentUser = null;
  var currentUser = null;
  window.rideTypes = [];
  var rideTypes = window.rideTypes;
  var PICKUP = { name: 'Nydalen T-banestasjon', address: 'Nydalen allé 1, Oslo', lat: 59.9494, lng: 10.7655 };
  window.PICKUP = PICKUP;
  var userLocation = null;

  // ---- Helpers ----
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }
  window.showToast = showToast;

  function setButtonLoading(btn, loading, text) {
    if (!btn) return;
    if (loading) {
      btn._originalText = btn.textContent;
      btn.innerHTML = '<span class="btn-spinner"></span>' + (text || 'Loading...');
      btn.classList.add('btn-loading');
    } else {
      btn.textContent = text || btn._originalText || 'Done';
      btn.classList.remove('btn-loading');
    }
  }
  window.setButtonLoading = setButtonLoading;

  function haptic(ms) { if (navigator.vibrate) navigator.vibrate(ms || 10); }
  window.haptic = haptic;

  // ---- Greeting & Status Bar ----
  function updateGreeting() {
    var el = document.getElementById('greeting');
    if (!el) return;
    var h = new Date().getHours();
    var period = (h >= 5 && h < 12) ? 'morning' : (h >= 12 && h < 17) ? 'afternoon' : (h >= 17 && h < 21) ? 'evening' : 'night';
    var userName = 'there';
    if (currentUser) {
      userName = (currentUser.user_metadata && currentUser.user_metadata.display_name)
        || (currentUser.email && currentUser.email.split('@')[0])
        || 'there';
    }
    el.textContent = 'Good ' + period + ', ' + userName + ' 👋';
  }

  function updateStatusTime() {
    var el = document.getElementById('status-time');
    if (!el) return;
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    el.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // ---- Location ----
  function updateLocationStatus(active, text) {
    var dot = document.getElementById('location-dot');
    var statusText = document.getElementById('location-status-text');
    if (dot) { dot.classList.toggle('active', !!active); }
    if (statusText) statusText.textContent = text;
  }

  function requestGeolocation() {
    if (!navigator.geolocation) {
      updateLocationStatus(false, 'Geolocation not supported');
      return;
    }
    updateLocationStatus(false, 'Finding your location...');
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        userLocation = { lat: lat, lng: lng };
        PICKUP.lat = lat;
        PICKUP.lng = lng;
        updateLocationStatus(true, 'Current location');
        showToast('Location updated', 'success');
      },
      function(err) {
        updateLocationStatus(false, 'Location unavailable');
        showToast('Using default pickup location', 'info');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function checkLocationPermission() {
    var perm = localStorage.getItem('ridego_location_perm');
    var modal = document.getElementById('location-modal');
    if (perm === 'granted') {
      requestGeolocation();
    } else if (perm === 'denied') {
      updateLocationStatus(false, 'Using default pickup');
    } else if (modal) {
      modal.style.display = '';
    }
  }

  // ---- Auth ----
  window.switchAuthTab = function(tab) {
    var tSignin = document.getElementById('tab-signin');
    var tSignup = document.getElementById('tab-signup');
    var fSignin = document.getElementById('form-signin');
    var fSignup = document.getElementById('form-signup');
    if (tSignin) tSignin.classList.toggle('active', tab === 'signin');
    if (tSignup) tSignup.classList.toggle('active', tab === 'signup');
    if (fSignin) fSignin.classList.toggle('hidden', tab !== 'signin');
    if (fSignup) fSignup.classList.toggle('hidden', tab !== 'signup');
    var err1 = document.getElementById('signin-error');
    var err2 = document.getElementById('signup-error');
    var ok = document.getElementById('signup-success');
    if (err1) err1.textContent = '';
    if (err2) err2.textContent = '';
    if (ok) ok.textContent = '';
  };

  window.handleSignIn = async function(e) {
    e.preventDefault();
    var btn = document.getElementById('signin-btn');
    var errEl = document.getElementById('signin-error');
    if (errEl) errEl.textContent = '';
    setButtonLoading(btn, true, 'Signing in…');
    var email = (document.getElementById('signin-email') || {}).value.trim();
    var password = (document.getElementById('signin-password') || {}).value;
    var result = await sb.auth.signInWithPassword({ email: email, password: password });
    if (result.error) {
      if (errEl) errEl.textContent = result.error.message;
      setButtonLoading(btn, false, 'Sign In');
      return;
    }
    currentUser = window.currentUser = result.data.user;
    var authScreen = document.getElementById('auth-screen');
    var appEl = document.getElementById('app');
    if (authScreen) authScreen.classList.add('hidden');
    if (appEl) appEl.style.display = '';
    setButtonLoading(btn, false, 'Sign In');
    initApp();
  };

  window.handleSignUp = async function(e) {
    e.preventDefault();
    var btn = document.getElementById('signup-btn');
    var errEl = document.getElementById('signup-error');
    var successEl = document.getElementById('signup-success');
    if (errEl) errEl.textContent = '';
    if (successEl) successEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    var name = (document.getElementById('signup-name') || {}).value.trim();
    var email = (document.getElementById('signup-email') || {}).value.trim();
    var password = (document.getElementById('signup-password') || {}).value;
    var result = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { display_name: name } }
    });
    if (result.error) {
      if (errEl) errEl.textContent = result.error.message;
      btn.disabled = false;
      btn.textContent = 'Create Account';
      return;
    }
    if (result.data.user && !result.data.session) {
      if (successEl) successEl.textContent = 'Check your email to confirm your account, then sign in.';
      btn.disabled = false;
      btn.textContent = 'Create Account';
      return;
    }
    currentUser = window.currentUser = result.data.user;
    var authScreen = document.getElementById('auth-screen');
    var appEl = document.getElementById('app');
    if (authScreen) authScreen.classList.add('hidden');
    if (appEl) appEl.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Create Account';
    initApp();
  };

  // ---- Recent searches (home page) ----
  var PLACES = {
    'Aker Brygge': { lat: 59.9075, lng: 10.7295, address: 'Brynjulf Bulls plass 6, Oslo' },
    'Oslo Sentralstasjon': { lat: 59.9111, lng: 10.7528, address: 'Jernbanetorget 1, Oslo' },
    'Grünerløkka': { lat: 59.9225, lng: 10.7590, address: 'Thorvald Meyers gate, Oslo' }
  };

  async function loadRecentSearches() {
    var homeList = document.querySelector('#screen-home .place-list');
    if (!homeList || !currentUser) return;
    var result = await sb.from('recent_searches')
      .select('name, address, location, searched_at')
      .eq('user_id', currentUser.id)
      .order('searched_at', { ascending: false })
      .limit(5);
    if (result.error || !result.data || result.data.length === 0) return;
    var data = result.data.map(function(r) {
      var lat = 0, lng = 0;
      if (PLACES[r.name]) {
        lat = PLACES[r.name].lat;
        lng = PLACES[r.name].lng;
      }
      return { name: r.name, address: r.address || '', lat: lat, lng: lng };
    });
    homeList.innerHTML = data.map(function(p) {
      return '<li class="place-item" data-name="' + (p.name || '').replace(/"/g, '&quot;') + '" data-lat="' + (p.lat || '') + '" data-lng="' + (p.lng || '') + '" data-address="' + (p.address || '').replace(/"/g, '&quot;') + '">' +
        '<div class="place-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
        '<div class="place-info"><div class="place-name">' + (p.name || 'Unknown') + '</div><div class="place-address">' + (p.address || '') + '</div></div></li>';
    }).join('');
  }

  // ---- Home: place list click → go to search with destination ----
  function initHomePlaceList() {
    var list = document.querySelector('#screen-home .place-list');
    if (!list) return;
    list.addEventListener('click', function(e) {
      var item = e.target.closest('.place-item');
      if (!item) return;
      var name = item.getAttribute('data-name') || '';
      var lat = parseFloat(item.getAttribute('data-lat'));
      var lng = parseFloat(item.getAttribute('data-lng'));
      var address = item.getAttribute('data-address') || '';
      if (name && !isNaN(lat) && !isNaN(lng)) {
        try {
          sessionStorage.setItem('ridego_destination', JSON.stringify({ name: name, address: address, lat: lat, lng: lng }));
        } catch (err) {}
        window.location.href = '/search/';
      }
    });
  }

  // ---- Google Maps (home only) ----
  var GOOGLE_MAPS_KEY = window.__RIDEGO_GOOGLE_MAPS_KEY || '';
  var _gmapsReady = false;
  var _gmapInstances = {};
  var _gmapMarkers = {};

  window.initGoogleMaps = function() {
    _gmapsReady = true;
    var homeEl = document.getElementById('gmap-home');
    if (homeEl && google && google.maps) {
      var center = { lat: PICKUP.lat, lng: PICKUP.lng };
      var map = new google.maps.Map(homeEl, {
        center: center,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0D0F14' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1D26' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] }
        ]
      });
      _gmapInstances.home = map;
      _gmapMarkers.homeLoc = new google.maps.Marker({
        position: center,
        map: map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
      });
    }
  };

  // ---- App Init ----
  async function initApp() {
    updateGreeting();
    updateStatusTime();
    setInterval(updateStatusTime, 10000);
    checkLocationPermission();

    if (!currentUser) {
      var sessionResult = await sb.auth.getSession();
      if (sessionResult.data.session) {
        currentUser = window.currentUser = sessionResult.data.session.user;
      } else {
        return;
      }
    }

    var rtResult = await sb.from('ride_types').select('*').eq('is_active', true).order('sort_order');
    if (!rtResult.error && rtResult.data) {
      rideTypes.length = 0;
      rideTypes.push.apply(rideTypes, rtResult.data);
    }

    loadRecentSearches();
    initHomePlaceList();

    var pathname = window.location.pathname;
    var params = new URLSearchParams(window.location.search);
    var bookingId = params.get('id') || params.get('ride_id');
    if ((pathname === '/trip/' || pathname === '/trip') && bookingId && typeof window.initTripPage === 'function') window.initTripPage(bookingId);
    if ((pathname === '/complete/' || pathname === '/complete') && bookingId && typeof window.initCompletePage === 'function') window.initCompletePage(bookingId);

    if (GOOGLE_MAPS_KEY) {
      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_MAPS_KEY + '&callback=initGoogleMaps&v=weekly';
      s.async = true;
      s.onerror = function() { console.error('[Maps] Failed to load'); };
      document.head.appendChild(s);
    }
  }

  // ---- Location modal buttons ----
  document.addEventListener('DOMContentLoaded', function() {
    var allowBtn = document.getElementById('location-allow-btn');
    var denyBtn = document.getElementById('location-deny-btn');
    if (allowBtn) {
      allowBtn.addEventListener('click', function() {
        localStorage.setItem('ridego_location_perm', 'granted');
        var modal = document.getElementById('location-modal');
        if (modal) modal.style.display = 'none';
        requestGeolocation();
      });
    }
    if (denyBtn) {
      denyBtn.addEventListener('click', function() {
        localStorage.setItem('ridego_location_perm', 'denied');
        var modal = document.getElementById('location-modal');
        if (modal) modal.style.display = 'none';
        updateLocationStatus(false, 'Using default pickup');
        showToast('Using default pickup location', 'info');
      });
    }
  });

  // ---- Check session on load ----
  (async function checkSession() {
    var sessionResult = await sb.auth.getSession();
    var authScreen = document.getElementById('auth-screen');
    var appEl = document.getElementById('app');
    if (sessionResult.data.session) {
      currentUser = window.currentUser = sessionResult.data.session.user;
      if (authScreen) authScreen.classList.add('hidden');
      if (appEl) appEl.style.display = '';
      initApp();
    }
  })();

  // Sign out: redirect to home after clearing session
  document.addEventListener('DOMContentLoaded', function() {
    var btnSignout = document.getElementById('btn-signout');
    if (btnSignout) {
      btnSignout.addEventListener('click', async function() {
        await sb.auth.signOut();
        window.currentUser = currentUser = null;
        window.location.href = '/';
      });
    }
  });

  window.initTripPage = function(rideId) {
    if (!rideId || !currentUser) return;
    sb.from('rides')
      .select('id, status, pickup_name, dropoff_name, driver_id, estimated_fare_nok, distance_km, duration_min')
      .eq('id', rideId)
      .eq('passenger_id', currentUser.id)
      .single()
      .then(function(res) {
        if (res.error || !res.data) {
          showToast('Ride not found', 'error');
          setTimeout(function() { window.location.href = '/'; }, 1500);
          return;
        }
        var ride = res.data;
        var pickupEl = document.getElementById('trip-pickup');
        var dropoffEl = document.getElementById('trip-dropoff');
        if (pickupEl) pickupEl.textContent = ride.pickup_name || 'Pickup';
        if (dropoffEl) dropoffEl.textContent = ride.dropoff_name || 'Drop-off';
        var labelEl = document.getElementById('trip-dest-marker-label');
        if (labelEl) labelEl.textContent = ride.dropoff_name || 'Drop-off';
        sb.channel('ride-' + rideId)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: 'id=eq.' + rideId }, function(payload) {
            var r = payload.new;
            var textEl = document.getElementById('arriving-text');
            if (r.status === 'driver_assigned' && textEl) textEl.textContent = 'Driver assigned';
            if (r.status === 'arriving' && textEl) textEl.textContent = 'Driver arriving';
            if (r.status === 'in_progress' && textEl) textEl.textContent = 'Trip in progress';
            if (r.status === 'completed') window.location.href = '/complete/?id=' + rideId;
          })
          .subscribe();
      });
  };

  window.initCompletePage = function(rideId) {
    if (!rideId || !currentUser) return;
    sb.from('rides')
      .select('id, pickup_name, dropoff_name, estimated_fare_nok, final_fare_nok, distance_km, duration_min')
      .eq('id', rideId)
      .eq('passenger_id', currentUser.id)
      .single()
      .then(function(res) {
        if (res.error || !res.data) {
          showToast('Ride not found', 'error');
          setTimeout(function() { window.location.href = '/'; }, 1500);
          return;
        }
        var ride = res.data;
        var routeEl = document.getElementById('fare-route');
        var totalEl = document.getElementById('fare-total');
        var baseEl = document.getElementById('fare-base');
        var distEl = document.getElementById('fare-dist');
        var timeEl = document.getElementById('fare-time');
        if (routeEl) routeEl.textContent = (ride.pickup_name || '') + ' → ' + (ride.dropoff_name || '');
        var fare = ride.final_fare_nok != null ? ride.final_fare_nok : ride.estimated_fare_nok;
        if (totalEl) totalEl.textContent = 'kr ' + (fare != null ? Math.round(fare) : '—');
        if (baseEl) baseEl.textContent = 'kr ' + (fare != null ? Math.round(fare * 0.37) : '—');
        if (distEl) distEl.textContent = (ride.distance_km != null ? ride.distance_km + ' km' : '—');
        if (timeEl) timeEl.textContent = (ride.duration_min != null ? ride.duration_min + ' min' : '—');
        var doneBtn = document.getElementById('done-btn');
        if (doneBtn) {
          doneBtn.addEventListener('click', function() {
            var starBtns = document.querySelectorAll('#stars .star-btn.active');
            var stars = starBtns.length || 5;
            var tipBtn = document.querySelector('#tip-row .tip-btn.active');
            var tip = tipBtn ? parseInt(tipBtn.getAttribute('data-tip'), 10) || 0 : 0;
            sb.rpc('rate_ride', { p_ride_id: rideId, p_stars: stars, p_tip_nok: tip, p_comment: null })
              .then(function() { showToast('Thanks!', 'success'); window.location.href = '/'; })
              .catch(function() { showToast('Saved', 'info'); window.location.href = '/'; });
          });
        }
      });
  };
})();
