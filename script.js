const API_KEY = "SorEmzpcP6OTvRxgUuJDmjQkTOPopcuA";
const WEB_APP_URLS = ["https://script.google.com/macros/s/AKfycbwNBmQRK2qXvgH1rguYnami5nmdv2pe6MR6isQx0sUVGCo5jhvLFbemvMjUX_fyJlIDRw/exec"];
let currentEndpointIndex = 0;

let masterConfig = {
    brands: [],
    userStatuses: [
        { name: "TO-DO", role: "to-do" },
        { name: "ON-PROGRESS", role: "on-progress" },
        { name: "SELESAI", role: "selesai" }
    ],
    systemStatusMendesak: "mendesak",
    systemStatusTerlambat: "terlambat",
    pics: [],
    tipes: [],
    platforms: [],
    spreadsheetUrl: "",
    sheetName: "",
    startRow: 2,
    columns: { brand: 1, status: 2, pic: 3, tipe: 4, platform: 5, deadline: 6, link: 7, catatan: 8 }
};

let contentPlans = [];
let configHash = '';
let dataHash = '';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let confirmActionCallback = null;

// ==========================================
// INISIALISASI & KONEKSI API
// ==========================================
async function initApp() {
    document.getElementById("loadingStatus").style.display = "block";
    initColDropdowns();
    await pollData();
    setInterval(pollData, 5000);
    setInterval(jalankanCountdown, 1000);
}

async function fetchAPI(action, payload = null) {
    let attempt = 0;
    while (attempt < WEB_APP_URLS.length) {
        try {
            let url = WEB_APP_URLS[currentEndpointIndex] + "?action=" + action + "&key=" + API_KEY;
            let options = payload ? { method: "POST", body: JSON.stringify(payload) } : {};
            
            const req = await fetch(url, options);
            const res = await req.json();
            
            if (res.status === 'error') throw new Error(res.message);
            return res;
        } catch (err) {
            currentEndpointIndex = (currentEndpointIndex + 1) % WEB_APP_URLS.length;
            attempt++;
        }
    }
    return null;
}

async function pollData() {
    const response = await fetchAPI("sync");
    if (response && response.config && response.data) {
        const newConfigHash = JSON.stringify(response.config);
        const newDataHash = JSON.stringify(response.data);

        if (newConfigHash !== configHash) {
            masterConfig = Object.assign({}, masterConfig, response.config);
            configHash = newConfigHash;
            updateFilterOptions();
            
            if (response.ssName && document.getElementById('adminSSUrlDisplay').getAttribute('data-modified') !== 'true') {
                document.getElementById('adminSSUrlDisplay').value = response.ssName;
                document.getElementById('adminSSUrlDisplay').style.color = '#fff';
            }
        }

        if (newDataHash !== dataHash) {
            contentPlans = response.data;
            dataHash = newDataHash;
            renderContent();
        }
        document.getElementById('loadingStatus').style.display = "none";
    }
}

// ==========================================
// LOGIKA PENCARIAN & RENDER KONTEN (SVG ASLI & EDIT/HAPUS)
// ==========================================
function handleSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput.value === "*Admin123") {
        bukaAdmin();
        searchInput.value = "";
    } else {
        renderContent();
    }
}

function filterLogic(plan) {
    const searchInput = document.getElementById("searchInput");
    const keyword = searchInput ? searchInput.value.toLowerCase() : "";
    
    if (keyword) {
        const matchBrand = (plan.brand || []).join(" ").toLowerCase().includes(keyword);
        const matchStatus = (plan.status || "").toLowerCase().includes(keyword);
        const matchPIC = (plan.penanggungJawab || []).join(" ").toLowerCase().includes(keyword);
        const matchCatatan = (plan.catatan || "").toLowerCase().includes(keyword);
        if (!matchBrand && !matchStatus && !matchPIC && !matchCatatan) return false;
    }
    
    const filterStatus = document.getElementById("filterStatus").value;
    if (filterStatus !== "ALL" && getRoleForStatus(plan.status) !== getRoleForStatus(filterStatus) && plan.status !== filterStatus) return false;
    
    const filterBrand = document.getElementById("filterBrand").value;
    if (filterBrand !== "ALL" && !(plan.brand || []).includes(filterBrand)) return false;

    return true;
}

function renderContent() {
    const container = document.getElementById("contentPlanList");
    container.innerHTML = '';
    
    let filteredPlans = contentPlans.filter(filterLogic);
    if (filteredPlans.length === 0) {
        container.innerHTML = '<div class="empty-state">Tidak ada data konten yang cocok.</div>';
        return;
    }

    filteredPlans.forEach(plan => {
        let statusClass = plan.status.toLowerCase().replace(/\s+/g, '-');
        let cardHTML = `
        <div class="card card-${statusClass}" id="card-${plan.id}">
            <div class="card-header">
                <div class="brand-badges-header">
                    ${(plan.brand || []).map(b => `<span class="brand-capsule">${b}</span>`).join('')}
                </div>
                <div class="card-header-actions">
                    <button class="btn-card-action edit" onclick="bukaModalEdit(${plan.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-card-action delete" onclick="hapusData(${plan.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
            <div class="card-details">
                <div class="detail-row"><span class="detail-label">Status</span><span class="badge ${statusClass}">${plan.status}</span></div>
                <div class="detail-row"><span class="detail-label">PIC</span><div class="scroll-x-container">${(plan.penanggungJawab || []).map(p => `<span class="pj-capsule">${p}</span>`).join('')}</div></div>
                <div class="detail-row"><span class="detail-label">Tipe</span><span class="type-capsule">${plan.tipeKonten || "-"}</span></div>
                <div class="detail-row"><span class="detail-label">Platform</span><div class="scroll-x-container">${(plan.platform || []).map(p => `<span class="platform-capsule ${p.toLowerCase()}">${p}</span>`).join('')}</div></div>
                <div class="detail-row"><span class="detail-label">Deadline</span><span class="deadline-badge">${plan.deadline ? new Date(plan.deadline).toLocaleString('id-ID') : "-"}</span></div>
                ${plan.deadline && statusClass !== 'selesai' && statusClass !== 'keterangan' ? `<div class="countdown-container"><span class="detail-label">Waktu Tersisa:</span><span class="countdown-timer" data-target="${plan.deadline}">Menghitung...</span></div>` : ''}
            </div>
            ${plan.catatan || plan.link ? `
            <div class="completed-section">
                ${plan.link ? `<div class="completed-field-group"><span class="completed-field-label">Link Hasil:</span><a href="${plan.link}" target="_blank" class="completed-clickable-box">${plan.link}</a></div>` : ''}
                ${plan.catatan ? `<div class="completed-field-group"><span class="completed-field-label">Catatan:</span><textarea class="completed-textarea-box" readonly rows="2">${plan.catatan}</textarea></div>` : ''}
            </div>` : ''}
        </div>`;
        container.innerHTML += cardHTML;
    });
}

function jalankanCountdown() {
    const now = new Date().getTime();
    document.querySelectorAll('.countdown-timer').forEach(el => {
        const targetDate = new Date(el.getAttribute('data-target')).getTime();
        if (isNaN(targetDate)) return;

        const diff = targetDate - now;
        if (diff <= 0) {
            el.innerText = "Terlambat";
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            el.innerText = `${days} Hari, ${hours} Jam, ${minutes} Menit, ${seconds} Detik`;
        }
    });
}

// ==========================================
// KONTEN FORM (TAMBAH / EDIT)
// ==========================================
function getRoleForStatus(statusName) {
    if (!statusName || !masterConfig.userStatuses) return 'on-progress';
    const found = masterConfig.userStatuses.find(s => s.name && s.name.toUpperCase() === statusName.toUpperCase());
    return found ? (found.role || 'on-progress').toLowerCase() : 'on-progress';
}

function handleFormStatusChange() {
    const statusVal = document.getElementById("formStatus").value;
    const role = getRoleForStatus(statusVal);
    
    // PERBAIKAN: Sembunyikan Deadline jika sifatnya 'to-do' ATAU 'keterangan'
    if (role === 'to-do' || role === 'keterangan') {
        document.getElementById("groupFormDeadline").style.display = 'none';
    } else {
        document.getElementById("groupFormDeadline").style.display = 'flex';
    }
    
    document.getElementById("groupFormLink").style.display = role === 'selesai' ? 'flex' : 'none';
    
    // Teks Area Catatan hanya muncul saat Keterangan
    const groupCatatan = document.getElementById("groupFormCatatan");
    const labelCatatan = document.getElementById("labelFormCatatan") || groupCatatan.querySelector("label");
    
    if (role === 'keterangan') {
        groupCatatan.style.display = "flex";
        labelCatatan.innerHTML = 'Catatan / Kendala <span style="color:#ef4444">(Wajib diisi)</span>';
    } else {
        groupCatatan.style.display = "none"; 
    }
    
    validateSaveButton();
}


function validateSaveButton() {
    const btnSubmit = document.getElementById("btnSubmitForm");
    if (!btnSubmit) return;

    const statusVal = document.getElementById("formStatus").value;
    const role = getRoleForStatus(statusVal);
    const catatan = document.getElementById("formCatatan").value.trim();
    const link = document.getElementById("formLink") ? document.getElementById("formLink").value.trim() : "";
    const brandSelected = Array.from(document.querySelectorAll("#brandSelectContainer select")).map(el => el.value).filter(Boolean);
    
    let isValid = true;
    if (brandSelected.length === 0) isValid = false;
    if (role === 'keterangan' && catatan === '') isValid = false;
    if (role === 'selesai' && link === '') isValid = false;

    btnSubmit.disabled = !isValid;
}

function bukaModalTambah() {
    document.getElementById("modalFormTitle").innerText = "Tambah Konten Plan";
    document.getElementById("formId").value = "";
    document.getElementById("formLink").value = "";
    document.getElementById("formCatatan").value = "";
    
    document.getElementById("brandSelectContainer").innerHTML = "";
    document.getElementById("picSelectContainer").innerHTML = "";
    document.getElementById("platformSelectContainer").innerHTML = "";
    
    tambahDropdown("brandSelectContainer", masterConfig.brands);
    tambahDropdown("picSelectContainer", masterConfig.pics);
    tambahDropdown("platformSelectContainer", masterConfig.platforms);
    
    const formStatus = document.getElementById("formStatus");
    formStatus.innerHTML = masterConfig.userStatuses.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    
    const formTipe = document.getElementById("formTipeKonten");
    formTipe.innerHTML = masterConfig.tipes.map(t => `<option value="${t}">${t}</option>`).join('');
    
    document.getElementById("formDeadline").value = "";
    
    handleFormStatusChange();
    document.getElementById("formModal").classList.add("active");
}

function bukaModalEdit(id) {
    const plan = contentPlans.find(p => p.id === id);
    if (!plan) return;
    
    document.getElementById("modalFormTitle").innerText = "Edit Konten Plan";
    document.getElementById("formId").value = plan.id;
    
    ['brand', 'pic', 'platform'].forEach(prefix => document.getElementById(prefix + "SelectContainer").innerHTML = "");
    
    plan.brand.forEach(b => tambahDropdown("brandSelectContainer", masterConfig.brands, b));
    plan.penanggungJawab.forEach(p => tambahDropdown("picSelectContainer", masterConfig.pics, p));
    plan.platform.forEach(p => tambahDropdown("platformSelectContainer", masterConfig.platforms, p));
    
    if (document.getElementById("brandSelectContainer").children.length === 0) tambahDropdown("brandSelectContainer", masterConfig.brands);
    if (document.getElementById("picSelectContainer").children.length === 0) tambahDropdown("picSelectContainer", masterConfig.pics);
    if (document.getElementById("platformSelectContainer").children.length === 0) tambahDropdown("platformSelectContainer", masterConfig.platforms);
    
    const formStatus = document.getElementById("formStatus");
    const userStatuses = masterConfig.userStatuses || [];
    formStatus.innerHTML = userStatuses.map(s => `<option value="${s.name || s}">${s.name || s}</option>`).join('');
    if (!userStatuses.map(s => s.name || s).includes(plan.status)) {
        formStatus.innerHTML += `<option value="${plan.status}" selected>${plan.status}</option>`;
    }
    formStatus.value = plan.status;
    
    const formTipe = document.getElementById("formTipeKonten");
    formTipe.innerHTML = (masterConfig.tipes || []).map(t => `<option value="${t}">${t}</option>`).join('');
    if (!(masterConfig.tipes || []).includes(plan.tipeKonten)) {
        formTipe.innerHTML += `<option value="${plan.tipeKonten}">${plan.tipeKonten}</option>`;
    }
    formTipe.value = plan.tipeKonten;
    
    let deadlineIso = "";
    if (plan.deadline) {
        let dl = plan.deadline.replace(' ', 'T');
        if (dl.length === 16) dl += ":00";
        const d = new Date(dl);
        if (!isNaN(d.getTime())) {
            deadlineIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
    }
    document.getElementById("formDeadline").value = deadlineIso;
    document.getElementById("formLink").value = plan.link || "";
    document.getElementById("formCatatan").value = plan.catatan || "";
    
    handleFormStatusChange();
    document.getElementById("formModal").classList.add("active");
}

function tutupModalForm() {
    document.getElementById("formModal").classList.remove("active");
}

function tambahDropdown(containerId, optionsList, selectedValue = "") {
    const container = document.getElementById(containerId);
    const div = document.createElement("div");
    div.className = "dynamic-select-row";
    
    let optionsHTML = `<option value="">-- Pilih --</option>` + (optionsList || []).map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`).join('');
    
    div.innerHTML = `
        <select style="flex:1" class="${containerId}-select" onchange="validateSaveButton()">${optionsHTML}</select>
        <button type="button" class="btn-remove-item" onclick="this.parentElement.remove(); validateSaveButton();">✕</button>
    `;
    container.appendChild(div);
    validateSaveButton();
}

async function simpanFormData() {
    const btnSubmit = document.getElementById("btnSubmitForm");
    const statusVal = document.getElementById("formStatus").value;
    const role = getRoleForStatus(statusVal);
    const catatan = document.getElementById("formCatatan").value.trim();

    if (role === 'keterangan' && catatan === '') {
        return showToast("Gagal", "Catatan wajib diisi untuk status Keterangan!", "error");
    }

    const brand = Array.from(document.querySelectorAll(".brandSelectContainer-select")).map(el => el.value).filter(Boolean);
    const penanggungJawab = Array.from(document.querySelectorAll(".picSelectContainer-select")).map(el => el.value).filter(Boolean);
    const platform = Array.from(document.querySelectorAll(".platformSelectContainer-select")).map(el => el.value).filter(Boolean);

    const payloadData = {
        id: document.getElementById("formId").value || null,
        brand: brand,
        status: statusVal,
        penanggungJawab: penanggungJawab,
        tipeKonten: document.getElementById("formTipeKonten").value,
        platform: platform,
        deadline: document.getElementById("formDeadline").value ? document.getElementById("formDeadline").value + ":00" : null,
        link: document.getElementById("formLink").value.trim(),
        catatan: role === 'keterangan' ? catatan : (document.getElementById("formCatatan").value.trim() || "")
    };

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Menyimpan...";

    try {
        const res = await fetchAPI("saveData", { data: payloadData });
        if(res && res.status === 'success') {
            showToast("Sukses", "Data berhasil disimpan!");
            tutupModalForm();
            pollData();
        } else {
            showToast("Gagal", res ? res.message : "Kesalahan server", "error");
        }
    } catch (e) {
        showToast("Gagal", "Terjadi kesalahan sistem", "error");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Simpan";
    }
}

function hapusData(id) {
    showCustomConfirm("Apakah Anda yakin ingin menghapus data ini?", async () => {
        showToast("Proses", "Menghapus data...");
        await fetchAPI("deleteData", { row: id });
        pollData();
    });
}

// ==========================================
// MODE ADMIN (ASLI)
// ==========================================
function initColDropdowns() {
    ['mainMappingContainer', 'migMappingContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const selects = container.querySelectorAll('select');
        selects.forEach((select, index) => {
            select.innerHTML = '';
            alphabet.forEach((letter, i) => { select.innerHTML += `<option value="${i + 1}">Kolom ${letter}</option>`; });
            select.value = (index + 1).toString();
            select.onchange = () => refreshMappingDropdowns(containerId);
        });
        refreshMappingDropdowns(containerId);
    });
}

function refreshMappingDropdowns(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const selects = Array.from(container.querySelectorAll('select'));
    const selectedValues = selects.map(s => s.value);
    selects.forEach(select => {
        const currentVal = select.value;
        Array.from(select.options).forEach(option => {
            option.disabled = (option.value !== currentVal && selectedValues.includes(option.value));
        });
    });
}

function handleUrlInput() {
    const urlDisplay = document.getElementById('adminSSUrlDisplay');
    document.getElementById('adminSSUrl').value = urlDisplay.value;
    urlDisplay.style.color = '#fff';
    urlDisplay.setAttribute('data-modified', 'true');
    validateAdminSaveButton();
}

function bukaAdmin() {
    document.getElementById("adminModal").classList.add("active");
    document.getElementById("adminSettingsView").style.display = "block";
    document.getElementById("adminMigrationView").style.display = "none";
    
    document.getElementById("adminSSUrlDisplay").value = masterConfig.spreadsheetUrl || "";
    document.getElementById("adminSSUrl").value = masterConfig.spreadsheetUrl || "";
    document.getElementById("adminStartRow").value = Math.max(parseInt(masterConfig.startRow) || 2, 2);

    const cols = masterConfig.columns || { brand: 1, status: 2, pic: 3, tipe: 4, platform: 5, deadline: 6, link: 7, catatan: 8 };
    document.getElementById("colBrand").value = cols.brand;
    document.getElementById("colStatus").value = cols.status;
    document.getElementById("colPIC").value = cols.pic;
    document.getElementById("colTipe").value = cols.tipe;
    document.getElementById("colPlatform").value = cols.platform;
    document.getElementById("colDeadline").value = cols.deadline;
    document.getElementById("colLink").value = cols.link;
    document.getElementById("colCatatan").value = cols.catatan;
    
    refreshMappingDropdowns("mainMappingContainer");
    
    document.getElementById("adminStatusMendesak").value = masterConfig.systemStatusMendesak || 'mendesak';
    document.getElementById("adminStatusTerlambat").value = masterConfig.systemStatusTerlambat || 'terlambat';

    populateAdminList("adminListBrands", masterConfig.brands);
    populateAdminList("adminListPICs", masterConfig.pics);
    populateAdminList("adminListTipes", masterConfig.tipes);
    populateAdminList("adminListPlatforms", masterConfig.platforms);
    
    document.getElementById("adminListUserStatuses").innerHTML = '';
    const userStatuses = masterConfig.userStatuses && masterConfig.userStatuses.length > 0 ? masterConfig.userStatuses : [
        { name: "TO-DO", role: "to-do" },
        { name: "ON-PROGRESS", role: "on-progress" },
        { name: "SELESAI", role: "selesai" }
    ];
    userStatuses.forEach(s => addAdminStatusInput("adminListUserStatuses", s));

    if (masterConfig.spreadsheetUrl) {
        loadSheetNames(null, 'adminSheetName', 'adminSSUrl', masterConfig.sheetName);
    }
    validateAdminSaveButton();
}

function tutupAdmin() {
    document.getElementById("adminModal").classList.remove("active");
    document.getElementById("searchInput").value = "";
}

function toggleMigrationView() {
    const migView = document.getElementById("adminMigrationView");
    const setView = document.getElementById("adminSettingsView");
    if (migView.style.display === "none") {
        migView.style.display = "block";
        setView.style.display = "none";
        ['Brand', 'Status', 'PIC', 'Tipe', 'Platform', 'Deadline', 'Link', 'Catatan'].forEach(col => {
            document.getElementById('mCol' + col).value = document.getElementById('col' + col).value;
        });
        refreshMappingDropdowns("migMappingContainer");
    } else {
        migView.style.display = "none";
        setView.style.display = "block";
    }
}

function addAdminListInput(containerId, value = '') {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'dynamic-select-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.oninput = validateAdminSaveButton;
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-remove-item';
    btn.innerHTML = '✕';
    btn.onclick = () => {
        if (container.children.length > 1) { div.remove(); validateAdminSaveButton(); }
        else { showToast('Peringatan', 'Minimal harus ada 1 pilihan.', 'error'); }
    };
    
    div.appendChild(input);
    div.appendChild(btn);
    container.appendChild(div);
    validateAdminSaveButton();
}

function addAdminStatusInput(containerId, statusObj) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'dynamic-select-row';
    
    const nameVal = typeof statusObj === 'string' ? statusObj.toUpperCase() : (statusObj ? statusObj.name.toUpperCase() : '');
    let roleVal = 'on-progress';
    if (statusObj && statusObj.role) roleVal = statusObj.role.toLowerCase();

    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.value = nameVal;
    inputName.placeholder = 'NAMA STATUS';
    inputName.style.flex = '1';
    inputName.oninput = function() { this.value = this.value.toUpperCase(); validateAdminSaveButton(); };

    const selectRole = document.createElement('select');
    selectRole.style.flex = '1';
    selectRole.innerHTML = `
        <option value="to-do" ${roleVal === 'to-do' ? 'selected' : ''}>Sifat: To-Do</option>
        <option value="on-progress" ${roleVal === 'on-progress' ? 'selected' : ''}>Sifat: On-Progress (Countdown)</option>
        <option value="selesai" ${roleVal === 'selesai' ? 'selected' : ''}>Sifat: Selesai</option>
        <option value="keterangan" ${roleVal === 'keterangan' ? 'selected' : ''}>Sifat: Keterangan (Wajib Catatan)</option>
    `;
    selectRole.onchange = validateAdminSaveButton;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-remove-item';
    btn.innerHTML = '✕';
    btn.onclick = () => {
        if (container.children.length > 1) { div.remove(); validateAdminSaveButton(); }
        else { showToast('Peringatan', 'Minimal harus ada 1 pilihan.', 'error'); }
    };

    div.appendChild(inputName);
    div.appendChild(selectRole);
    div.appendChild(btn);
    container.appendChild(div);
    validateAdminSaveButton();
}

function populateAdminList(containerId, items) {
    document.getElementById(containerId).innerHTML = '';
    (items || []).forEach(item => addAdminListInput(containerId, item));
    if (!items || items.length === 0) addAdminListInput(containerId);
}

async function loadSheetNames(event, selectId, urlInputId, selectedSheet = '') {
    const url = document.getElementById(urlInputId).value;
    if (!url) return showToast('Gagal', 'URL Spreadsheet kosong', 'error');
    
    if (event) event.target.innerText = "Loading...";
    const res = await fetchAPI('getSheets&url=' + encodeURIComponent(url));
    if (event) event.target.innerText = "Load";
    
    if (res && res.status === 'success') {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        res.sheets.forEach(sheet => {
            select.innerHTML += `<option value="${sheet}" ${sheet === selectedSheet ? 'selected' : ''}>${sheet}</option>`;
        });
        
        if (urlInputId === 'adminSSUrl') {
            document.getElementById('adminSSUrlDisplay').value = res.ssName;
            document.getElementById('adminSSUrlDisplay').style.color = 'var(--glow-pj)';
            document.getElementById('adminSSUrlDisplay').setAttribute('data-modified', 'false');
        }
        if (event) showToast('Sukses', 'Sheet berhasil di-load.', 'success');
        validateAdminSaveButton();
    } else {
        if (event) showToast('Gagal', 'URL tidak valid atau tidak ada akses.', 'error');
    }
}

function validateAdminSaveButton() {
    const btn = document.getElementById("btnSaveAdminConfig");
    if (!btn) return;
    
    const url = document.getElementById("adminSSUrl").value.trim();
    const sheet = document.getElementById("adminSheetName").value.trim();
    const row = parseInt(document.getElementById("adminStartRow").value);
    
    if (!url || !sheet || isNaN(row) || row < 2) btn.disabled = true;
    else btn.disabled = false;
}

function buildConfigPayload(isMigrasi = false) {
    const prefix = isMigrasi ? 'mig' : 'admin';
    const colPrefix = isMigrasi ? 'mCol' : 'col';
    
    const getList = (id) => Array.from(document.getElementById(id).querySelectorAll('input')).map(el => el.value.trim()).filter(Boolean);
    const getStatuses = () => Array.from(document.getElementById('adminListUserStatuses').querySelectorAll('.dynamic-select-row')).map(row => {
        const name = row.querySelector('input').value.trim().toUpperCase();
        const role = row.querySelector('select').value;
        return name ? { name, role } : null;
    }).filter(Boolean);

    return {
        spreadsheetUrl: document.getElementById(prefix + 'SSUrl').value.trim(),
        sheetName: document.getElementById(prefix + 'SheetName').value.trim(),
        startRow: Math.max(parseInt(document.getElementById(prefix + 'StartRow').value) || 2, 2),
        columns: {
            brand: parseInt(document.getElementById(colPrefix + 'Brand').value) || 1,
            status: parseInt(document.getElementById(colPrefix + 'Status').value) || 2,
            pic: parseInt(document.getElementById(colPrefix + 'PIC').value) || 3,
            tipe: parseInt(document.getElementById(colPrefix + 'Tipe').value) || 4,
            platform: parseInt(document.getElementById(colPrefix + 'Platform').value) || 5,
            deadline: parseInt(document.getElementById(colPrefix + 'Deadline').value) || 6,
            link: parseInt(document.getElementById(colPrefix + 'Link').value) || 7,
            catatan: parseInt(document.getElementById(colPrefix + 'Catatan').value) || 8
        },
        brands: getList('adminListBrands'),
        systemStatusMendesak: document.getElementById('adminStatusMendesak').value.trim() || 'mendesak',
        systemStatusTerlambat: document.getElementById('adminStatusTerlambat').value.trim() || 'terlambat',
        userStatuses: getStatuses(),
        pics: getList('adminListPICs'),
        tipes: getList('adminListTipes'),
        platforms: getList('adminListPlatforms')
    };
}

async function saveAdminConfig(event) {
    const btn = event.target;
    btn.innerText = "Menyimpan...";
    const config = buildConfigPayload(false);
    
    if (!config.spreadsheetUrl || !config.sheetName) {
        validateAdminSaveButton();
        return showToast('Gagal', 'Lengkapi seluruh field wajib', 'error');
    }
    
    const res = await fetchAPI('saveConfig', { config: config });
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan Config`;
    
    if (res && res.status === 'success') {
        masterConfig = config;
        showToast('Berhasil', 'Konfigurasi diperbarui', 'success');
        tutupAdmin();
        pollData();
    }
}

async function jalankanMigrasi(event) {
    showCustomConfirm('Anda yakin ingin migrasi? Data akan disalin ke Spreadsheet baru.', async () => {
        const btn = event.target;
        btn.innerText = 'Memigrasi...';
        const config = buildConfigPayload(true);
        
        if (!config.spreadsheetUrl || !config.sheetName) {
            btn.innerText = 'Jalankan Migrasi';
            return showToast('Gagal', 'Lengkapi Link & Sheet Tujuan', 'error');
        }
        
        const res = await fetchAPI('migrateData', { config: config, deleteOld: false });
        btn.innerText = 'Jalankan Migrasi';
        
        if (res && res.status === 'success') {
            masterConfig = config;
            showToast('Migrasi Berhasil', 'Data berhasil dipindahkan.', 'success');
            tutupAdmin();
            pollData();
        } else {
            showToast('Gagal Migrasi', res ? res.message : 'Kesalahan server', 'error');
        }
    });
}

// ==========================================
// TOAST, MODAL & UTILITIES
// ==========================================
function showToast(title, message, type = 'success') {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast-alert " + type;
    toast.innerHTML = `<div class="toast-content"><span class="toast-title">${title}</span><span class="toast-desc">${message}</span></div>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

function showCustomConfirm(msg, callback) {
    document.getElementById("customConfirmMessage").innerText = msg;
    confirmActionCallback = callback;
    document.getElementById("customConfirmModal").classList.add("active");
}

function tutupCustomConfirm() {
    document.getElementById("customConfirmModal").classList.remove("active");
    confirmActionCallback = null;
}

document.getElementById("btnConfirmAction").addEventListener("click", () => {
    if (confirmActionCallback) confirmActionCallback();
    tutupCustomConfirm();
});

function bukaModalFilter() { document.getElementById("filterModal").classList.add("active"); }
function tutupModalFilter() { document.getElementById("filterModal").classList.remove("active"); }
function updateFilterOptions() {}
function toggleDownloadMenu(e) { document.getElementById("downloadMenu").classList.toggle("show"); }

window.addEventListener('load', () => {
    initApp();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.log('SW', e));
});


// ==========================================
// FITUR EXPORT / DOWNLOAD (CSV & EXCEL)
// ==========================================
function formatTanggalMurni(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const month = d.toLocaleDateString('id-ID', { month: 'long' });
    const year = d.getFullYear();
    return day + ' ' + month + ' ' + year;
}

function exportToCSV(plans) {
    const headers = ['Brand', 'Status', 'PIC', 'Tipe', 'Platform', 'Deadline', 'Link', 'Catatan'];
    let csvContent = headers.join(',') + '\n';
    plans.forEach(plan => {
        let row = [
            '"' + (plan.brand || []).join(', ') + '"',
            '"' + plan.status + '"',
            '"' + (plan.penanggungJawab || []).join(', ') + '"',
            '"' + plan.tipeKonten + '"',
            '"' + (plan.platform || []).join(', ') + '"',
            '"' + formatTanggalMurni(plan.deadline) + '"',
            '"' + (plan.link || '') + '"',
            '"' + (plan.catatan || '').replace(/"/g, '""') + '"'
        ];
        csvContent += row.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'KontenPlan_' + new Date().getTime() + '.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportToExcel(plans) {
    if (typeof ExcelJS === 'undefined') return showToast('Gagal', 'Library Excel gagal dimuat, cek koneksi internet.', 'error');
    showToast('Proses', 'Mempersiapkan File Excel...', 'success');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Konten');
    worksheet.columns = [
        { header: 'Brand', key: 'brand', width: 25 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'PIC', key: 'pic', width: 20 },
        { header: 'Tipe', key: 'tipe', width: 22 },
        { header: 'Platform', key: 'platform', width: 22 },
        { header: 'Deadline', key: 'deadline', width: 25 },
        { header: 'Link', key: 'link', width: 40 },
        { header: 'Catatan', key: 'catatan', width: 40 }
    ];

    worksheet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF121826' } };
        cell.font = { color: { argb: 'FF38BDF8' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF38BDF8' } },
            bottom: { style: 'medium', color: { argb: 'FF38BDF8' } },
            left: { style: 'thin', color: { argb: 'FF38BDF8' } },
            right: { style: 'thin', color: { argb: 'FF38BDF8' } }
        };
    });

    plans.forEach(plan => {
        worksheet.addRow({
            brand: (plan.brand || []).join(', '),
            status: plan.status,
            pic: (plan.penanggungJawab || []).join(', '),
            tipe: plan.tipeKonten,
            platform: (plan.platform || []).join(', '),
            deadline: formatTanggalMurni(plan.deadline),
            link: plan.link || '',
            catatan: plan.catatan || ''
        });
    });

    const brandList = masterConfig.brands && masterConfig.brands.length > 0 ? '"' + masterConfig.brands.join(',') + '"' : '';
    const rawStatuses = (masterConfig.userStatuses || []).map(s => typeof s === 'string' ? s : s.name);
    const statusList = '"' + [...rawStatuses, masterConfig.systemStatusMendesak || 'mendesak', masterConfig.systemStatusTerlambat || 'terlambat'].join(',') + '"';
    const picList = masterConfig.pics && masterConfig.pics.length > 0 ? '"' + masterConfig.pics.join(',') + '"' : '';
    
    const totalRows = plans.length + 1;
    for (let i = 2; i <= totalRows; i++) {
        const row = worksheet.getRow(i);
        row.eachCell({ includeEmpty: true }, cell => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
        });
        
        if (brandList) worksheet.getCell('A' + i).dataValidation = { type: 'list', allowBlank: true, formulae: [brandList], showErrorMessage: true };
        if (statusList) worksheet.getCell('B' + i).dataValidation = { type: 'list', allowBlank: true, formulae: [statusList], showErrorMessage: true };
        if (picList) worksheet.getCell('C' + i).dataValidation = { type: 'list', allowBlank: true, formulae: [picList], showErrorMessage: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KontenPlan_' + new Date().getTime() + '.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function triggerDownload(type) {
    document.getElementById("downloadMenu").classList.remove("show");
    const plansToDownload = contentPlans.filter(filterLogic);
    if (plansToDownload.length === 0) return showToast('Gagal', 'Tidak ada data untuk diunduh', 'error');
    
    if (type === 'csv') {
        exportToCSV(plansToDownload);
    } else {
        await exportToExcel(plansToDownload);
    }
}
