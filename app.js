(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const {t, getLanguage} = window.ScoutI18n;
  const presets = [
    {name:'fastest', exclude:''},
    {name:'local', exclude:'motorway', checkbox:'avoid-motorway'},
    {name:'toll', exclude:'toll', checkbox:'avoid-toll'}
  ];
  const token = () => (window.SCOUT_MAPBOX_TOKEN || localStorage.getItem('scout_public_token') || sessionStorage.getItem('scout_public_token') || '').trim();
  const savedKey = 'scout_saved_trips_v1';
  const mode = () => document.querySelector('input[name="mode"]:checked').value;
  let map, markers = [], userMarker, watchId = null, routes = [], selected = -1;
  let currentLocationPoint = null, locationRequest = 0, locationStatus = null;
  let requestController, searchContext, status = {key:'ready', values:{}};
  let languageRefreshController;
  const selectedPlaces = {from:null, to:null};
  let voiceEnabled = true, nextStepIndex = 0, guidanceInitialized = false, lastGuidanceSpeechAt = 0, stepPositions = [];
  let activeUtterance = null, speechTimer = null, speechCheckTimer = null;
  const voiceLocales = {en:'en-US', de:'de-DE', it:'it-IT', fr:'fr-FR', nl:'nl-NL', fa:'fa-IR'};
  const instructionLanguage = () => getLanguage() === 'fa' ? 'en' : getLanguage();
  const voiceKey = voice => [voice.name, voice.lang, voice.voiceURI].join('|');
  const voiceTag = voice => (voice.lang || '').replace('_', '-').toLowerCase();
  let savedTrips = readSaved();

  function readSaved() {
    try {
      const entries = JSON.parse(localStorage.getItem(savedKey) || '[]');
      return Array.isArray(entries) ? entries.filter(item => item.route?.geometry?.coordinates?.length > 1).slice(0, 5) : [];
    } catch { return []; }
  }
  function renderStatus() {
    if (status.key === 'routeCount') return t('routeCount', {
      n:status.values.n,
      failed:status.values.failed ? t('failedRequests', {n:status.values.failed}) : ''
    });
    return t(status.key, status.values);
  }
  function say(key, values = {}) {
    status = {key, values}; $('status').textContent = renderStatus();
  }
  function showGps(key, values = {}) {
    $('gps-status').hidden = false;
    $('gps-status').dataset.message = key;
    $('gps-status').textContent = t(key, values);
  }
  function showLocationStatus(key, values = {}) {
    locationStatus = {key, values};
    $('current-location-status').hidden = false;
    $('current-location-status').textContent = t(key, values);
  }
  function showUserMarker(point, heading) {
    if (!map) return;
    if (!userMarker) {
      const icon = document.createElement('div'); icon.className = 'traveller-marker';
      icon.textContent = mode() === 'driving' ? '🚗' : mode() === 'cycling' ? '🚲' : '🚶';
      userMarker = new mapboxgl.Marker({element:icon}).setLngLat(point).addTo(map);
    } else userMarker.setLngLat(point);
    if (Number.isFinite(heading)) userMarker.setRotation(heading);
  }
  function initMap() {
    if (map) return;
    if (!window.mapboxgl) throw new Error(t('mapLoadError'));
    mapboxgl.accessToken = token();
    map = new mapboxgl.Map({
      container:'map', style:'mapbox://styles/mapbox/dark-v11',
      center:[10.3,47.6], zoom:7, language:getLanguage()
    });
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.on('error', event => say('mapError', {error:event.error?.message || t('checkToken')}));
    map.on('style.load', () => {
      $('map-placeholder').hidden = true;
      if (selected >= 0) drawRoute();
      else if (selectedPlaces.from?.isCurrent && currentLocationPoint) showUserMarker(currentLocationPoint);
    });
  }
  async function getJSON(url, signal) {
    const response = await fetch(url, {signal});
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code && data.code !== 'Ok')
      throw new Error(data.message || t('requestFailed', {status:response.status}));
    return data;
  }
  async function geocodeCandidates(query, signal, proximity) {
    const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
    const params = {q:query, limit:'5', autocomplete:'false', access_token:token()};
    if (proximity) params.proximity = proximity.join(',');
    url.search = new URLSearchParams(params).toString();
    const features = (await getJSON(url, signal)).features || [];
    return features.filter(feature => feature.geometry?.coordinates?.length === 2).map(feature => ({
      coordinates:feature.geometry.coordinates,
      label:feature.properties?.full_address ||
        [feature.properties?.name,feature.properties?.place_formatted].filter(Boolean).join(', ') || query
    }));
  }
  function hideChoices(which) { $(which + '-options').hidden = true; $(which + '-options').replaceChildren(); }
  function clearPlace(which) {
    if (which === 'from') currentLocationPoint = null;
    selectedPlaces[which] = null; $(which).classList.remove('place-confirmed'); hideChoices(which);
  }
  function showChoices(which, candidates) {
    const list = $(which + '-options'); list.replaceChildren(); list.hidden = false;
    const help = document.createElement('p'); help.className = 'place-help'; help.textContent = t('placeHelp'); list.append(help);
    candidates.forEach(candidate => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = candidate.label;
      button.addEventListener('click', async () => {
        selectedPlaces[which] = candidate; $(which).value = candidate.label;
        $(which).classList.add('place-confirmed'); hideChoices(which);
        if (which === 'from' && !selectedPlaces.to) await offerChoices('to', requestController?.signal);
        else if (selectedPlaces.from && selectedPlaces.to) $('route-form').requestSubmit();
      });
      list.append(button);
    });
    list.scrollIntoView({block:'center', behavior:'smooth'});
  }
  async function offerChoices(which, signal) {
    const query = $(which).value.trim();
    if (!query) return;
    say('searchingPlaces');
    try {
      const candidates = await geocodeCandidates(query, signal, which === 'to' ? selectedPlaces.from?.coordinates : null);
      if (signal?.aborted) return;
      if (!candidates.length) { say('placeNotFound'); return; }
      showChoices(which, candidates); say(which === 'from' ? 'confirmFrom' : 'confirmTo');
    } catch (error) { if (error.name !== 'AbortError') say('placeSearchFailed'); }
  }
  async function directions(from, to, profile, preset, signal) {
    const url = new URL('https://api.mapbox.com/directions/v5/mapbox/' + profile + '/' + from.join(',') + ';' + to.join(','));
    const requestedLanguage = instructionLanguage();
    const params = {access_token:token(), geometries:'geojson', overview:'full', alternatives:'true', steps:'true', language:requestedLanguage};
    if (profile === 'driving-traffic') params.notifications = 'all';
    if (preset.exclude && profile === 'driving-traffic') params.exclude = preset.exclude;
    url.search = new URLSearchParams(params).toString();
    const data = await getJSON(url, signal);
    return (data.routes || []).filter(route => route.geometry?.coordinates?.length > 1)
      .map(route => ({geometry:route.geometry, duration:route.duration, distance:route.distance,
        legs:route.legs, preset, profile, instructionLanguage:requestedLanguage}));
  }
  function routeTitle(route, index) {
    return index === 0 ? t('fastest') : route.preset.exclude
      ? t(route.preset.name) : t('alternative', {n:index + 1});
  }
  function routeMetrics(route) {
    return formatDuration(route.duration) + ' · ' +
      t('kilometers', {n:(route.distance / 1000).toFixed(1)});
  }
  function formatDuration(duration) {
    const total = Math.max(0, Math.round(Number(duration) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const seconds = total % 60;
    const parts = [];
    if (hours) parts.push(t('durationHour', {n:hours}));
    if (hours || minutes) parts.push(t('durationMinute', {n:minutes}));
    parts.push(t('durationSecond', {n:seconds}));
    return parts.join(' ');
  }
  function displayRoutes() {
    $('results').replaceChildren();
    $('results-panel').hidden = !routes.length;
    $('trip-panel').hidden = !routes.length || selected < 0;
    if (!routes.length) return;
    const fastest = Math.min(...routes.map(route => route.duration));
    routes.forEach((route, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'route-card';
      button.setAttribute('aria-pressed', String(index === selected));
      const title = document.createElement('strong'); title.textContent = routeTitle(route, index);
      const metrics = document.createElement('span'); metrics.className = 'metrics'; metrics.textContent = routeMetrics(route);
      const detail = document.createElement('small');
      const extra = Math.round((route.duration - fastest) / 60);
      const violation = route.legs?.some(leg => leg.notifications?.some(item => item.type === 'violation'));
      detail.textContent = (extra > 0 ? t('longer', {n:extra}) : '') +
        (violation ? t('roadNotice') : route.preset.exclude ? t('preference') :
          index === 0 ? t('fastestDetail') : t('another'));
      const choose = document.createElement('span'); choose.className = 'choose';
      choose.textContent = t(index === selected ? 'selected' : 'show');
      button.append(title, metrics, detail, choose);
      button.addEventListener('click', () => {
        stopGps(); selected = index; displayRoutes(); drawRoute();
        refreshSelectedInstructions();
      });
      const entry = document.createElement('div'); entry.className = 'route-entry'; entry.append(button);
      if (index === selected) {
        const actions = document.createElement('div'); actions.className = 'route-quick-actions';
        const save = document.createElement('button'); save.type = 'button'; save.className = 'secondary'; save.textContent = t('save');
        save.addEventListener('click', () => $('save-trip').click());
        const start = document.createElement('button'); start.type = 'button'; start.className = 'primary quick-start';
        start.textContent = t(watchId === null ? 'start' : 'stop');
        start.addEventListener('click', () => {
          $('start-trip').click();
          start.textContent = t(watchId === null ? 'start' : 'stop');
          $('trip-panel').scrollIntoView({block:'start', behavior:'smooth'});
        });
        actions.append(save, start); entry.append(actions);
      }
      $('results').append(entry);
    });
    $('selected-summary').textContent = routeTitle(routes[selected], selected) + ' · ' + routeMetrics(routes[selected]);
  }
  function drawRoute() {
    if (!map?.isStyleLoaded() || selected < 0) return;
    const coordinates = routes[selected].geometry.coordinates;
    const lines = {type:'FeatureCollection', features:routes.map((route, index) =>
      ({type:'Feature', geometry:route.geometry, properties:{index}}))};
    if (map.getSource('route')) map.getSource('route').setData(lines);
    else {
      map.addSource('route', {type:'geojson', data:lines});
      map.addLayer({id:'route-options', type:'line', source:'route',
        layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':'#94a99a','line-width':4,'line-opacity':0.8}});
      map.addLayer({id:'route-selected', type:'line', source:'route', filter:['==',['get','index'], selected],
        layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':'#cce480','line-width':7}});
    }
    map.setFilter('route-selected', ['==',['get','index'], selected]);
    markers.forEach(marker => marker.remove()); markers = [];
    for (const point of [coordinates[0], coordinates[coordinates.length - 1]])
      markers.push(new mapboxgl.Marker({color:'#f1b66f'}).setLngLat(point).addTo(map));
    const bounds = coordinates.reduce((acc, point) => acc.extend(point),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds, {padding:55, maxZoom:14, duration:600});
    if (selectedPlaces.from?.isCurrent && currentLocationPoint && watchId === null)
      showUserMarker(currentLocationPoint);
  }
  function clearResults() {
    languageRefreshController?.abort();
    stopGps(); routes = []; selected = -1; searchContext = null; displayRoutes();
    if (map?.getSource('route')) map.getSource('route').setData({type:'FeatureCollection', features:[]});
    markers.forEach(marker => marker.remove()); markers = [];
  }
  function stopGps() {
    if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
    watchId = null;
    cancelSpeech(); nextStepIndex = 0; guidanceInitialized = false; lastGuidanceSpeechAt = 0; stepPositions = [];
    userMarker?.remove(); userMarker = null;
    $('start-trip').textContent = t('start');
    document.querySelectorAll('.quick-start').forEach(button => { button.textContent = t('start'); });
    $('gps-status').hidden = true; $('gps-note').hidden = true; $('voice-note').hidden = true;
    $('next-instruction').hidden = true;
    $('steps').hidden = true; $('steps-language-note').hidden = true;
  }
  function renderSteps() {
    const list = $('steps'); list.replaceChildren();
    const steps = routes[selected]?.legs?.flatMap(leg => leg.steps || []) || [];
    steps.forEach(step => {
      const item = document.createElement('li');
      item.textContent = step.maneuver?.instruction || step.name || t('arrival');
      list.append(item);
    });
    list.hidden = !steps.length;
    const oldLanguage = routes[selected]?.instructionLanguage;
    const changed = getLanguage() !== 'fa' && oldLanguage && oldLanguage !== getLanguage();
    $('steps-language-note').hidden = !steps.length || (!changed && getLanguage() !== 'fa');
    $('steps-language-note').textContent = t(changed && getLanguage() !== 'fa' ? 'instructionsRefresh' : 'instructionsFallback');
  }
  async function refreshSelectedInstructions() {
    languageRefreshController?.abort();
    if (selected < 0) return;
    if (getLanguage() === 'fa') { showGps('persianGuidanceUnavailable'); return; }
    const original = routes[selected];
    if (original.instructionLanguage === getLanguage()) return;
    const requested = getLanguage(), geometry = JSON.stringify(original.geometry.coordinates);
    const controller = new AbortController(); languageRefreshController = controller;
    showGps('instructionsLoading');
    try {
      const points = original.geometry.coordinates;
      const from = selectedPlaces.from?.coordinates || points[0];
      const to = selectedPlaces.to?.coordinates || points.at(-1);
      const candidates = await directions(from, to, original.profile,
        original.preset || presets[0], controller.signal);
      if (controller.signal.aborted || requested !== getLanguage() || routes[selected] !== original) return;
      const matching = candidates.find(candidate => JSON.stringify(candidate.geometry.coordinates) === geometry);
      if (!matching) { showGps('instructionsRefresh'); return; }
      original.legs = matching.legs;
      original.instructionLanguage = matching.instructionLanguage;
      guidanceInitialized = false; stepPositions = [];
      if (!$('steps').hidden) renderSteps();
      showGps('instructionsUpdated');
    } catch (error) {
      if (!controller.signal.aborted) showGps('instructionsRefresh');
    } finally {
      if (languageRefreshController === controller) languageRefreshController = null;
    }
  }
  function cancelSpeech() {
    if (speechTimer !== null) clearTimeout(speechTimer);
    if (speechCheckTimer !== null) clearTimeout(speechCheckTimer);
    speechTimer = null; speechCheckTimer = null; activeUtterance = null;
    window.speechSynthesis?.cancel();
  }
  function availableVoices(language) {
    const requested = voiceLocales[language].toLowerCase();
    return (window.speechSynthesis?.getVoices?.() || [])
      .filter(voice => voiceTag(voice).split('-')[0] === language)
      .sort((a,b) => Number(voiceTag(b) === requested) - Number(voiceTag(a) === requested));
  }
  function chosenVoice(language) {
    const voices = availableVoices(language);
    let saved;
    try { saved = localStorage.getItem('scout_voice_' + language); } catch { /* Use the best available voice. */ }
    return voices.find(voice => voiceKey(voice) === saved) || voices[0];
  }
  function renderVoices() {
    const select = $('voice-choice'); select.replaceChildren();
    const language = getLanguage(), voices = availableVoices(language);
    if (!voices.length) {
      const option = document.createElement('option');
      option.textContent = t((window.speechSynthesis?.getVoices?.() || []).length ? 'voiceNone' : 'voiceAuto');
      select.append(option); select.disabled = true;
    } else {
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voiceKey(voice); option.textContent = voice.name + ' (' + voice.lang + ')';
        select.append(option);
      });
      select.disabled = false; select.value = voiceKey(chosenVoice(language));
    }
    const chosen = chosenVoice(language);
    $('voice-dialect-note').hidden = language !== 'fa' || !chosen || voiceTag(chosen) === 'fa-ir';
    $('voice-dialect-note').textContent = t('voiceDialect');
  }
  function speak(instruction, language, isTest = false) {
    if (!voiceEnabled || !window.speechSynthesis || !window.SpeechSynthesisUtterance || !instruction) return false;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices?.() || [];
    const voice = chosenVoice(language);
    if (!voice) { showGps(voices.length ? 'voiceMissing' : 'voiceAuto'); return false; }
    if (speechTimer !== null) clearTimeout(speechTimer);
    const wasPlaying = synth.speaking || synth.pending;
    if (wasPlaying) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = 0.95;
    activeUtterance = utterance;
    utterance.onstart = () => {
      if (speechCheckTimer !== null) clearTimeout(speechCheckTimer);
      speechCheckTimer = null;
      if (isTest && activeUtterance === utterance) showGps('voicePlaying');
    };
    utterance.onend = () => {
      if (activeUtterance !== utterance) return;
      if (speechCheckTimer !== null) clearTimeout(speechCheckTimer);
      speechCheckTimer = null;
      activeUtterance = null;
      if (isTest) showGps('voicePlayed');
    };
    utterance.onerror = event => {
      if (activeUtterance !== utterance) return;
      if (speechCheckTimer !== null) clearTimeout(speechCheckTimer);
      speechCheckTimer = null;
      activeUtterance = null;
      if (!['canceled', 'interrupted'].includes(event.error)) showGps('voiceError');
    };
    const play = () => {
      speechTimer = null;
      if (activeUtterance !== utterance) return;
      try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
        if (isTest) speechCheckTimer = setTimeout(() => {
          if (activeUtterance === utterance && !synth.speaking) {
            activeUtterance = null; synth.cancel(); showGps('voiceError');
          }
          speechCheckTimer = null;
        }, 3000);
      }
      catch { activeUtterance = null; showGps('voiceError'); }
    };
    if (wasPlaying) speechTimer = setTimeout(play, 100);
    else play();
    return true;
  }
  function distanceMeters(a, b) {
    const rad = Math.PI / 180, lat1 = a[1] * rad, lat2 = b[1] * rad;
    const deltaLat = (b[1] - a[1]) * rad, deltaLon = (b[0] - a[0]) * rad;
    const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(h));
  }
  function routeProgress(point, coordinates) {
    let covered = 0, nearest = {distance:Infinity, along:0};
    for (let index = 1; index < coordinates.length; index++) {
      const a = coordinates[index - 1], b = coordinates[index];
      const scale = Math.cos(point[1] * Math.PI / 180);
      const dx = (b[0] - a[0]) * scale, dy = b[1] - a[1];
      const fraction = Math.max(0, Math.min(1, (((point[0] - a[0]) * scale * dx) + ((point[1] - a[1]) * dy)) / (dx * dx + dy * dy || 1)));
      const projection = [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
      const distance = distanceMeters(point, projection);
      const segment = distanceMeters(a, b);
      if (distance < nearest.distance) nearest = {distance, along:covered + segment * fraction};
      covered += segment;
    }
    return nearest;
  }
  function updateGuidance(point) {
    const route = routes[selected];
    if (!route) return;
    if (getLanguage() !== 'fa' && route.instructionLanguage !== getLanguage()) {
      $('next-instruction').hidden = false;
      $('next-instruction').textContent = t('instructionsRefresh');
      return;
    }
    const coordinates = route.geometry.coordinates;
    const progress = routeProgress(point, coordinates);
    const next = $('next-instruction'); next.hidden = false;
    const allowedDistance = mode() === 'driving' ? 120 : 60;
    if (progress.distance > allowedDistance) {
      next.textContent = t('offRoute');
      return;
    }
    const steps = routes[selected]?.legs?.flatMap(leg => leg.steps || []) || [];
    if (!guidanceInitialized) {
      stepPositions = steps.map(step => step.maneuver?.location ?
        routeProgress(step.maneuver.location, coordinates).along : Infinity);
      const upcoming = stepPositions.findIndex(along => along >= progress.along - 30);
      nextStepIndex = upcoming < 0 ? steps.length : upcoming;
      guidanceInitialized = true;
    }
    while (nextStepIndex < steps.length && stepPositions[nextStepIndex] < progress.along - 50) nextStepIndex++;
    const step = steps[nextStepIndex];
    const location = step?.maneuver?.location;
    if (!location) {
      next.textContent = distanceMeters(point, coordinates.at(-1)) < allowedDistance ? t('arrival') : t('continueRoute');
      return;
    }
    const meters = Math.max(0, Math.round(stepPositions[nextStepIndex] - progress.along));
    next.textContent = t('nextManeuver', {n:meters, instruction:step.maneuver.instruction || t('continueRoute')});
    const threshold = mode() === 'driving' ? 250 : mode() === 'cycling' ? 90 : 45;
    if (meters <= threshold && Date.now() - lastGuidanceSpeechAt > 5000) {
      const spoken = !voiceEnabled || getLanguage() === 'fa' ||
        speak(step.maneuver.instruction, getLanguage());
      if (spoken) {
        lastGuidanceSpeechAt = Date.now();
        nextStepIndex++;
      }
    }
  }
  function renderSaved() {
    $('saved-list').replaceChildren();
    if (!savedTrips.length) { const empty = document.createElement('p'); empty.className = 'hint'; empty.textContent = t('emptySaved'); $('saved-list').append(empty); return; }
    savedTrips.forEach((trip, index) => {
      const row = document.createElement('div'); row.className = 'saved-entry';
      const open = document.createElement('button'); open.type = 'button';
      open.textContent = trip.from + ' → ' + trip.to;
      const info = document.createElement('small'); info.textContent = t(trip.mode === 'driving' ? 'drive' : trip.mode === 'walking' ? 'walk' : 'cycle') + ' · ' + routeMetrics(trip.route);
      open.append(info);
      open.addEventListener('click', () => {
        requestController?.abort(); clearResults();
        $('from').value = trip.from; $('to').value = trip.to;
        clearPlace('from'); clearPlace('to');
        document.querySelector('input[name="mode"][value="' + trip.mode + '"]').checked = true;
        updateMode();
        routes = [trip.route]; selected = 0;
        searchContext = {from:trip.from, to:trip.to, mode:trip.mode};
        displayRoutes(); say('savedLoaded');
        if (token()) { try { initMap(); drawRoute(); } catch (error) { say('mapError', {error:error.message}); } }
        $('results-panel').scrollIntoView({block:'start', behavior:'smooth'});
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = t('remove');
      remove.addEventListener('click', () => {
        savedTrips.splice(index, 1); localStorage.setItem(savedKey, JSON.stringify(savedTrips));
        renderSaved(); say('removedMessage');
      });
      row.append(open, remove); $('saved-list').append(row);
    });
  }
  function updateMode() { $('driving-preferences').hidden = mode() !== 'driving'; }

  $('route-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!token().startsWith('pk.')) { $('settings').open = true; say('addToken'); return; }
    requestController?.abort(); requestController = new AbortController();
    const {signal} = requestController;
    if (!selectedPlaces.from || selectedPlaces.from.label !== $('from').value.trim()) {
      clearPlace('from'); await offerChoices('from', signal); return;
    }
    if (!selectedPlaces.to || selectedPlaces.to.label !== $('to').value.trim()) {
      clearPlace('to'); await offerChoices('to', signal); return;
    }
    const fromLabel = selectedPlaces.from.label, toLabel = selectedPlaces.to.label, selectedMode = mode();
    $('search').disabled = true; clearResults(); say('finding');
    try {
      initMap();
      const from = selectedPlaces.from.coordinates, to = selectedPlaces.to.coordinates;
      const profile = selectedMode === 'driving' ? 'driving-traffic' : selectedMode;
      const active = selectedMode === 'driving'
        ? presets.filter(preset => !preset.checkbox || $(preset.checkbox).checked)
        : [presets[0]];
      const responses = await Promise.allSettled(active.map(preset => directions(from, to, profile, preset, signal)));
      if (signal.aborted) return;
      const failures = responses.filter(result => result.status === 'rejected');
      const seen = new Set();
      responses.forEach(result => {
        if (result.status !== 'fulfilled') return;
        result.value.forEach(route => {
          const key = JSON.stringify(route.geometry.coordinates);
          if (!seen.has(key)) { seen.add(key); routes.push(route); }
        });
      });
      routes.sort((a,b) => a.duration - b.duration);
      if (!routes.length) throw new Error(failures[0]?.reason?.message || t('noRoutes'));
      selected = 0; searchContext = {from:fromLabel, to:toLabel, mode:selectedMode};
      displayRoutes(); drawRoute();
      say(routes.length === 1 ? 'noExtra' : 'routeCount', {n:routes.length, failed:failures.length});
      $('results-panel').scrollIntoView({block:'start', behavior:'smooth'});
    } catch (error) { if (error.name !== 'AbortError') say('mapError', {error:error.message || t('searchFailed')}); }
    finally { if (!signal.aborted) $('search').disabled = false; }
  });
  document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', () => {
    requestController?.abort(); $('search').disabled = false;
    clearResults(); updateMode(); say('ready');
  }));
  for (const which of ['from','to']) $(which).addEventListener('input', () => {
    clearPlace(which);
    if (which === 'from') clearPlace('to');
    requestController?.abort(); clearResults(); $('search').disabled = false;
  });
  $('swap').addEventListener('click', () => {
    [$('from').value, $('to').value] = [$('to').value, $('from').value];
    [selectedPlaces.from, selectedPlaces.to] = [selectedPlaces.to, selectedPlaces.from];
    currentLocationPoint = null;
    clearResults();
  });
  $('current-location').addEventListener('click', () => {
    if (!window.isSecureContext) { showLocationStatus('gpsSecure'); return; }
    if (!navigator.geolocation) { showLocationStatus('gpsDenied'); return; }
    requestController?.abort();
    const request = ++locationRequest;
    $('current-location').disabled = true;
    showLocationStatus('gpsWaiting');
    const usePosition = position => {
      if (request !== locationRequest) return;
      $('current-location').disabled = false;
      const destinationConfirmed = selectedPlaces.to && selectedPlaces.to.label === $('to').value.trim();
      clearPlace('from'); clearResults();
      currentLocationPoint = [position.coords.longitude, position.coords.latitude];
      selectedPlaces.from = {coordinates:currentLocationPoint, label:t('currentLocation'), isCurrent:true};
      $('from').value = selectedPlaces.from.label; $('from').classList.add('place-confirmed');
      showLocationStatus('locationReady', {n:Math.round(position.coords.accuracy)});
      try {
        if (token().startsWith('pk.')) {
          initMap(); showUserMarker(currentLocationPoint);
          map.easeTo({center:currentLocationPoint, zoom:14, duration:500});
        }
      } catch (error) { say('mapError', {error:error.message}); }
      if (destinationConfirmed) $('route-form').requestSubmit();
      else if ($('to').value.trim() && token().startsWith('pk.')) {
        requestController = new AbortController(); offerChoices('to', requestController.signal);
      }
    };
    const failed = error => {
      if (request !== locationRequest) return;
      $('current-location').disabled = false;
      showLocationStatus(error.code === 1 ? 'gpsDenied' : error.code === 3 ? 'locationTimedOut' : 'locationUnavailable');
    };
    navigator.geolocation.getCurrentPosition(usePosition, error => {
      if (request !== locationRequest) return;
      if (error.code === 1) { failed(error); return; }
      showLocationStatus('locationRetry');
      navigator.geolocation.getCurrentPosition(usePosition, failed,
        {enableHighAccuracy:false, maximumAge:30000, timeout:25000});
    }, {enableHighAccuracy:true, maximumAge:15000, timeout:12000});
  });
  $('save-trip').addEventListener('click', () => {
    if (selected < 0 || !searchContext) { say('chooseFirst'); return; }
    const route = routes[selected];
    const trip = {id:Date.now(), ...searchContext,
      route:{geometry:route.geometry, duration:route.duration, distance:route.distance,
        legs:route.legs, preset:route.preset, profile:route.profile, instructionLanguage:route.instructionLanguage}};
    const next = [trip, ...savedTrips].slice(0, 5);
    try { localStorage.setItem(savedKey, JSON.stringify(next)); savedTrips = next; renderSaved(); say('savedMessage'); }
    catch { say('storageError'); }
  });
  $('start-trip').addEventListener('click', async () => {
    if (watchId !== null) { stopGps(); return; }
    if (selected < 0) { say('chooseFirst'); return; }
    if (!token().startsWith('pk.')) { $('settings').open = true; say('addToken'); return; }
    if (getLanguage() !== 'fa' && routes[selected].instructionLanguage !== getLanguage()) {
      await refreshSelectedInstructions();
      if (selected < 0 || routes[selected].instructionLanguage !== getLanguage()) return;
    }
    if (!window.isSecureContext) { showGps('gpsSecure'); return; }
    if (!navigator.geolocation) { showGps('gpsDenied'); return; }
    showGps('gpsWaiting'); $('gps-note').hidden = false;
    $('voice-note').hidden = !window.speechSynthesis;
    nextStepIndex = 0; guidanceInitialized = false; lastGuidanceSpeechAt = 0; stepPositions = []; renderSteps();
    watchId = navigator.geolocation.watchPosition(position => {
      const point = [position.coords.longitude, position.coords.latitude];
      if (map) {
        showUserMarker(point, position.coords.heading);
        map.easeTo({center:point, zoom:Math.max(map.getZoom(), 13), duration:500});
      }
      showGps(getLanguage() === 'fa' ? 'persianGuidanceUnavailable' : 'gpsActive');
      updateGuidance(point);
    }, error => {
      showGps(error.code === 1 ? 'gpsDenied' : 'locationError', {error:error.message});
      stopGps(); showGps(error.code === 1 ? 'gpsDenied' : 'locationError', {error:error.message});
    }, {enableHighAccuracy:true, maximumAge:5000, timeout:15000});
    $('start-trip').textContent = t('stop');
    document.querySelectorAll('.quick-start').forEach(button => { button.textContent = t('stop'); });
  });
  $('voice-toggle').addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled) cancelSpeech();
    $('voice-toggle').setAttribute('aria-pressed', String(voiceEnabled));
    $('voice-toggle').textContent = t($('voice-toggle').disabled ? 'voiceUnavailable' : voiceEnabled ? 'voiceOn' : 'voiceOff');
  });
  $('voice-test').addEventListener('click', () => {
    if (!voiceEnabled) { showGps('voiceOff'); return; }
    speak(t('voiceSample'), getLanguage(), true);
  });
  $('voice-choice').addEventListener('change', event => {
    try { localStorage.setItem('scout_voice_' + getLanguage(), event.target.value); } catch { /* Current selection still works. */ }
    cancelSpeech(); renderVoices();
  });
  $('save-token').addEventListener('click', () => {
    const value = $('token').value.trim();
    if (!value.startsWith('pk.')) { say('invalidToken'); return; }
    localStorage.setItem('scout_public_token', value);
    sessionStorage.removeItem('scout_public_token');
    if (map) { map.remove(); map = null; markers = []; userMarker = null; initMap(); }
    say('savedToken');
  });
  $('clear-token').addEventListener('click', () => {
    localStorage.removeItem('scout_public_token'); sessionStorage.removeItem('scout_public_token');
    $('token').value = ''; say('clearedToken');
  });
  document.addEventListener('scout:language', () => {
    cancelSpeech();
    for (const which of ['from','to']) if (selectedPlaces[which]?.isCurrent) {
      selectedPlaces[which].label = t('currentLocation'); $(which).value = selectedPlaces[which].label;
    }
    if (map) {
      try { map.setLanguage(getLanguage()); }
      catch (error) { console.warn('Map label translation unavailable:', error); }
    }
    displayRoutes(); renderSaved();
    $('status').textContent = renderStatus();
    if (locationStatus) $('current-location-status').textContent = t(locationStatus.key, locationStatus.values);
    $('start-trip').textContent = t(watchId === null ? 'start' : 'stop');
    $('voice-toggle').textContent = t($('voice-toggle').disabled ? 'voiceUnavailable' : voiceEnabled ? 'voiceOn' : 'voiceOff');
    renderVoices();
    $('results').setAttribute('aria-label', t('resultsAria'));
    $('saved-list').setAttribute('aria-label', t('savedAria'));
    $('map-section').setAttribute('aria-label', t('mapAria'));
    if (!$('steps').hidden) renderSteps();
    if (watchId !== null && !$('next-instruction').hidden) $('next-instruction').textContent = t('gpsActive');
    if (!$('gps-status').hidden) $('gps-status').textContent = t($('gps-status').dataset.message);
    refreshSelectedInstructions();
  });
  $('token').value = localStorage.getItem('scout_public_token') || sessionStorage.getItem('scout_public_token') || '';
  if (window.SCOUT_MAPBOX_TOKEN) $('settings').hidden = true;
  else if (!token()) $('settings').open = true;
  updateMode(); renderSaved();
  renderVoices();
  window.speechSynthesis?.addEventListener?.('voiceschanged', renderVoices);
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    $('voice-toggle').disabled = true; $('voice-toggle').textContent = t('voiceUnavailable');
    $('voice-test').disabled = true;
  }
})();
