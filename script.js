let currentZone = 'main';
const defaultItems = [
    "JW Gold", "JW Black Am", "JW Black 70 cl", "JW Red Aav", "JW Red 70 cl",
    "Captain Morgan Spice Gold", "Gilbey Whisky", "Golden Stag", "Smirnoff Ice red",
    "Smirnoff Midnight 100 (Can)", "SilverWolf", "แสงโสม", "หงษ์", "รีเจนซี่กลม",
    "รีเจนซี่แบน", "โซจูเลม่อน", "โซจูสตอเบอรี", "โซจูองุ่น", "ลีโอ", "สิงห์",
    "สิงห์รีเสิร์ฟ", "ภูเก็ตกระป๋องฟ้า", "ภูเก็ตกระป๋องเหลือง", "เสือใหญ่ กระป๋อง",
    "เสือใหญ่ขวด", "ช้างคูบ", "โซดา", "น้ำดื่มขวดพลาสติก", "โค้กกระป๋อง",
    "สไปร์ทกระป๋อง", "เลมอนโซดากระป๋อง", "น้ำแข็ง", "ทิชชู"
];

// --- Custom Modal Logic ---
let pendingConfirmAction = null;

function openConfirmModal(title, desc, type, callback) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc;

    const btn = document.getElementById('modalConfirmBtn');
    btn.className = 'btn-modal-confirm ' + type;

    if (type === 'danger') {
        document.getElementById('modalIcon').innerText = '🗑️';
        btn.innerText = 'ปิดหน้าต่าง'; // เปลี่ยนจากคำว่าลบข้อมูล เผื่อใช้แจ้งเตือน Error
        if (callback) btn.innerText = 'ลบข้อมูล';
    } else if (type === 'warning') {
        document.getElementById('modalIcon').innerText = '⚠️';
        btn.innerText = 'รับทราบ';
        if (callback && callback.toString() !== "() => {}") btn.innerText = 'ยืนยัน'; // เช็คว่าเป็นแค่ Alert หรือปุ่มยืนยัน
    } else if (type === 'info') {
        document.getElementById('modalIcon').innerText = '📋';
        btn.innerText = 'คัดลอก';
    } else if (type === 'success') {
        document.getElementById('modalIcon').innerText = '✅';
        btn.innerText = 'ตกลงและบันทึก';
    }

    pendingConfirmAction = callback;
    document.getElementById('customModal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('customModal').classList.remove('show');
    pendingConfirmAction = null;
}

document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    if (pendingConfirmAction) pendingConfirmAction();
    closeConfirmModal();
});

// --- Initialize ---
window.onload = () => {
    ['main', 'stock'].forEach(zone => {
        if (!localStorage.getItem(`${zone}_columns`)) {
            let customCols = localStorage.getItem('custom_default_columns');
            if (customCols) {
                localStorage.setItem(`${zone}_columns`, customCols);
            }
        }

        if (!localStorage.getItem(`${zone}_items`)) {
            let customItems = localStorage.getItem('custom_default_items');
            let initialData;

            if (customItems) {
                initialData = JSON.parse(customItems).map((item, index) => {
                    let newItem = { id: Date.now() + index, name: item.name };
                    let cols = JSON.parse(localStorage.getItem(`${zone}_columns`) || '[]');
                    cols.forEach(c => newItem[c.id] = '');
                    return newItem;
                });
            } else {
                initialData = defaultItems.map((name, index) => ({
                    id: Date.now() + index, name, previous: '', received: '', total: '', sold: '', remaining: '', remarks: ''
                }));
            }
            localStorage.setItem(`${zone}_items`, JSON.stringify(initialData));
        }

        if (!localStorage.getItem(`${zone}_history`)) localStorage.setItem(`${zone}_history`, '[]');
    });

    switchZone('main');

    setTimeout(() => {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }, 400);
};

// --- Column Logic ---
function getColumns() {
    let cols = JSON.parse(localStorage.getItem(`${currentZone}_columns`));
    if (!cols) {
        let customCols = localStorage.getItem('custom_default_columns');
        if (customCols) {
            cols = JSON.parse(customCols);
        } else {
            cols = [
                { id: 'previous', name: 'ยกมา' },
                { id: 'received', name: 'รับเข้า' },
                { id: 'total', name: 'รวม' },
                { id: 'sold', name: 'ขาย' },
                { id: 'remaining', name: 'คงเหลือ' },
                { id: 'remarks', name: 'หมายเหตุ' }
            ];
        }
        saveColumns(cols);
    }
    return cols;
}

function saveColumns(cols) { localStorage.setItem(`${currentZone}_columns`, JSON.stringify(cols)); }

function renderThead() {
    let cols = getColumns();
    let html = `<tr>
        <th style="width: 50px;">ลำดับ</th>
        <th>รายการ</th>`;

    // แก้ไขส่วนนี้ใน renderThead
    cols.forEach(c => {
        let isDefault = ['previous', 'received', 'total', 'sold', 'remaining', 'remarks'].includes(c.id);
        let calcIcon = c.calc ? ' <span style="font-size:10px;">🧮</span>' : '';

        html += `<th>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span class="editable-th" onclick="openEditColumnModal('${c.id}')">${c.name}${calcIcon} ✏️</span>
                </div>
        </th>`;
    });


    document.getElementById('dynamic-thead').innerHTML = html;
}

function deleteColumn(colId) {
    openConfirmModal(
        'ยืนยันการลบคอลัมน์',
        'ข้อมูลในคอลัมน์นี้จะหายไปทั้งหมด\nคุณต้องการดำเนินการต่อหรือไม่?',
        'danger',
        () => {
            let cols = getColumns();
            cols = cols.filter(c => c.id !== colId);
            saveColumns(cols);
            renderThead();
            renderStock();
        }
    );
}

function openAddColumnModal() {
    document.getElementById('addColName').value = '';
    document.getElementById('addColType').value = 'number';
    document.getElementById('addColumnModal').classList.add('show');
    setTimeout(() => document.getElementById('addColName').focus(), 100);
}

function closeAddColumnModal() {
    document.getElementById('addColumnModal').classList.remove('show');
}

function confirmAddColumn() {
    let name = document.getElementById('addColName').value;
    // บรรทัดนี้จะดึงค่าจาก <input type="hidden"> ที่เราเตรียมไว้ให้โดยอัตโนมัติ
    let colType = document.getElementById('addColType').value;

    if (name && name.trim()) {
        let cols = getColumns();
        cols.push({ id: 'col_' + Date.now(), name: name.trim(), type: colType });
        saveColumns(cols);
        renderThead();
        renderStock();

        // อย่าลืมอัปเดตรายการในปุ่มกรอกเลขด่วนด้วย
        if (typeof updateQuickInputDropdowns === "function") {
            updateQuickInputDropdowns();
        }

        closeAddColumnModal();
    } else {
        openConfirmModal('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อคอลัมน์ที่ต้องการเพิ่ม', 'warning', () => {});
    }
}
// --- Calculation Logic ---
function toggleCalcFields() {
    const isChecked = document.getElementById('enableCalcToggle').checked;
    document.getElementById('calcFields').style.display = isChecked ? 'flex' : 'none';
}

function selectMathOp(op) {
    document.getElementById('calcOperator').value = op;
    const opMap = { '+': 'Add', '-': 'Sub', '*': 'Mul', '/': 'Div' };

    Object.values(opMap).forEach(val => {
        let el = document.getElementById('btnMath' + val);
        if(el) {
            el.classList.remove('active');
            el.style.background = '#222';
        }
    });

    let activeEl = document.getElementById('btnMath' + opMap[op]);
    if(activeEl) {
        activeEl.classList.add('active');
        activeEl.style.background = '#3B82F6';
    }
}

function calculateFormula(item, col) {
    if (!col.calc) return item[col.id];
    let val1 = parseFloat(item[col.calc.col1]) || 0;
    let val2 = parseFloat(item[col.calc.col2]) || 0;
    let result = 0;
    switch(col.calc.op) {
        case '+': result = val1 + val2; break;
        case '-': result = val1 - val2; break;
        case '*': result = val1 * val2; break;
        case '/': result = val2 !== 0 ? val1 / val2 : 0; break;
    }
    result = Math.round(result * 100) / 100;
    return result === 0 ? '' : result;
}

function recalculateAllItems() {
    let items = getItems();
    let cols = getColumns();
    items.forEach(item => {
        cols.forEach(c => {
            if (c.calc) {
                item[c.id] = calculateFormula(item, c);
            }
        });
    });
    saveItems(items);
}

function runRowCalculations(item, tr) {
    let cols = getColumns();
    cols.forEach(c => {
        if (c.calc) {
            let newVal = calculateFormula(item, c);
            if (item[c.id] !== newVal) {
                item[c.id] = newVal;
                if(tr) {
                    let inputEl = tr.querySelector(`input[data-field="${c.id}"]`);
                    if (inputEl) inputEl.value = newVal;
                }
            }
        }
    });
}

// --- Core Logic ---
function getItems() { return JSON.parse(localStorage.getItem(`${currentZone}_items`)); }
function saveItems(items) { localStorage.setItem(`${currentZone}_items`, JSON.stringify(items)); }
function getHistory() { return JSON.parse(localStorage.getItem(`${currentZone}_history`)); }
function saveHistory(history) { localStorage.setItem(`${currentZone}_history`, JSON.stringify(history)); }

function switchZone(zone) {
    currentZone = zone;
    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`zone-${zone}`).classList.add('active');
    const zoneName = zone === 'main' ? 'บาร์หลัก' : 'สต๊อกบาร์';
    document.getElementById('save-btn').innerText = `💾 ยืนยันสต็อกประจำวัน (${zoneName})`;

    if (document.getElementById('history-page').classList.contains('active')) {
        renderHistory();
    } else {
        renderThead();
        renderStock();
    }
}

function switchPage(pageId) {
    document.querySelectorAll('.page, .tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
    document.getElementById(`tab-${pageId}`).classList.add('active');
    if (pageId === 'history') renderHistory();
    if (pageId === 'record') { renderThead(); renderStock(); }
}

function loadDefaultItems() {
    openConfirmModal(
        'ดึงรายการเริ่มต้นใหม่',
        'ข้อมูลเก่าและคอลัมน์ในหน้านี้จะถูกล้างและรีเซ็ตใหม่ทั้งหมด!\nคุณต้องการดำเนินการต่อหรือไม่?',
        'warning',
        () => {
            let customCols = localStorage.getItem('custom_default_columns');
            let customItems = localStorage.getItem('custom_default_items');

            if (customCols) {
                saveColumns(JSON.parse(customCols));
            } else {
                let defaultCols = [
                    { id: 'previous', name: 'ยกมา' },
                    { id: 'received', name: 'รับเข้า' },
                    { id: 'total', name: 'รวม' },
                    { id: 'sold', name: 'ขาย' },
                    { id: 'remaining', name: 'คงเหลือ' },
                    { id: 'remarks', name: 'หมายเหตุ' }
                ];
                saveColumns(defaultCols);
            }

            if (customItems) {
                let cols = getColumns();
                let initialData = JSON.parse(customItems).map((item, index) => {
                    let newItem = { id: Date.now() + index, name: item.name };
                    cols.forEach(c => newItem[c.id] = '');
                    return newItem;
                });
                saveItems(initialData);
            } else {
                let initialData = defaultItems.map((name, index) => ({
                    id: Date.now() + index, name, previous: '', received: '', total: '', sold: '', remaining: '', remarks: ''
                }));
                saveItems(initialData);
            }

            recalculateAllItems();
            renderThead();
            renderStock();
        }
    );
}

function saveCurrentAsDefault() {
    let items = getItems();
    if (!items.length) {
        openConfirmModal('แจ้งเตือน', 'ไม่มีรายการสินค้าให้บันทึกเป็นค่าเริ่มต้น', 'warning', () => {});
        return;
    }

    openConfirmModal(
        'ตั้งเป็นค่าเริ่มต้นใหม่',
        'ระบบจะจดจำรายการสินค้าและคอลัมน์ในหน้านี้\nเป็น "ค่าเริ่มต้น" เมื่อคุณกดรีเซ็ตในครั้งต่อไป\n(ข้อมูลยอดตัวเลขจะไม่ถูกจำไปด้วย)',
        'success',
        () => {
            let currentCols = getColumns();
            let cleanItems = items.map(item => {
                let cleanItem = { id: item.id, name: item.name };
                currentCols.forEach(c => cleanItem[c.id] = '');
                return cleanItem;
            });

            localStorage.setItem('custom_default_items', JSON.stringify(cleanItems));
            localStorage.setItem('custom_default_columns', JSON.stringify(currentCols));

            setTimeout(() => {
                document.getElementById('successModal').classList.add('show');
            }, 500);
        }
    );
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('show');
}

function addItem() {
    const input = document.getElementById('newItemName');
    const name = input.value.trim();
    if (name) {
        let items = getItems();
        let cols = getColumns();
        let newItem = { id: Date.now(), name: name };
        cols.forEach(c => newItem[c.id] = '');

        items.push(newItem);
        saveItems(items);
        recalculateAllItems();
        input.value = '';
        renderStock();
    }
}

function deleteItem(id) {
    let items = getItems();
    let item = items.find(i => i.id === id);

    openConfirmModal(
        'ลบรายการสินค้า',
        `คุณต้องการลบรายการ "${item.name}"\nออกจากหน้านี้ใช่หรือไม่?`,
        'danger',
        () => {
            saveItems(items.filter(i => i.id !== id));
            renderStock();
        }
    );
}

function adjustValue(id, field, amount, btn) {
    let items = getItems();
    let item = items.find(i => i.id === id);
    let cols = getColumns();
    let targetCol = cols.find(c => c.id === field);

    if (targetCol && targetCol.calc) {
        return;
    }

    if (item) {
        let currentVal = parseFloat(item[field]) || 0;
        let newVal = Math.max(0, currentVal + amount);
        item[field] = newVal === 0 ? '' : newVal;

        let tr = btn.closest('tr');
        tr.querySelector(`input[data-field="${field}"]`).value = item[field];

        runRowCalculations(item, tr);
        saveItems(items);
    }
}

function handleInput(id, field, el) {
    let items = getItems();
    let item = items.find(i => i.id === id);
    if (item) {
        item[field] = el.value;
        let tr = el.closest('tr');
        runRowCalculations(item, tr);
        saveItems(items);
    }
}

function renderStock() {
    let items = getItems();
    let cols = getColumns();
    let html = '';

    if (!items.length) {
        document.getElementById('stock-list').innerHTML = `<tr><td colspan="${cols.length + 3}" class="empty-hint">ยังไม่มีรายการสินค้า</td></tr>`;
        return;
    }

    items.forEach((item, index) => {
        let row = `<tr>
            <td>${index + 1}</td>
            <td class="col-name" onclick="openEditItemModal(${index})">${item.name} ✏️</td>`;

        cols.forEach(c => {
            let isAuto = !!c.calc;
            let readOnly = isAuto ? 'readonly' : '';
            let style = isAuto ? 'background: #2A2A2A; color: #888;' : '';

            if (c.type === 'text' || c.id === 'remarks') {
                row += `<td>
                    <input type="text" class="tbl-input" style="width: 100%; min-width: 120px; text-align: left; padding: 0 10px; ${style}"
                    value="${item[c.id] || ''}" oninput="handleInput(${item.id}, '${c.id}', this)" ${readOnly} placeholder="-">
                </td>`;
            } else {
                row += `<td>
                    <div class="qty-selector">
                        <button class="btn-qty btn-minus" onclick="adjustValue(${item.id}, '${c.id}', -1, this)" ${isAuto ? 'disabled' : ''}>-</button>
                        <input type="number" class="tbl-input" data-field="${c.id}" value="${item[c.id] || ''}"
                        oninput="handleInput(${item.id}, '${c.id}', this)" ${readOnly} style="${style}">
                        <button class="btn-qty btn-plus" onclick="adjustValue(${item.id}, '${c.id}', 1, this)" ${isAuto ? 'disabled' : ''}>+</button>
                    </div>
                </td>`;
            }
        });

        row += `<td><button class="btn-delete" onclick="deleteItem(${item.id})">🗑️</button></td></tr>`;
        html += row;
    });
    document.getElementById('stock-list').innerHTML = html;
    if (typeof updateQuickInputDropdowns === "function") updateQuickInputDropdowns();
}
// --- History & Export ---
function saveToHistory() {
    let items = getItems();
    if (!items.length) {
        openConfirmModal('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับบันทึก', 'warning', () => { });
        return;
    }

    openConfirmModal(
        'ยืนยันการบันทึกสต็อก',
        'คุณตรวจสอบความถูกต้องครบถ้วนแล้ว\nและต้องการบันทึกสต็อกประจำวันใช่หรือไม่?',
        'success',
        () => {
            let historyRecords = getHistory();
            const now = new Date();
            historyRecords.unshift({
                date: `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`,
                columns: JSON.parse(JSON.stringify(getColumns())),
                items: JSON.parse(JSON.stringify(items))
            });
            saveHistory(historyRecords);
            switchPage('history');
            window.scrollTo(0, 0);
        }
    );
}

function renderHistory() {
    const list = document.getElementById('history-list');
    let historyRecords = getHistory();
    if (!historyRecords.length) return list.innerHTML = '<p class="empty-hint">ยังไม่มีประวัติ</p>';

    let html = '';
    historyRecords.forEach((record, idx) => {
        let recCols = record.columns || [
            { id: 'previous', name: 'ยกมา' }, { id: 'received', name: 'รับเข้า' }, { id: 'total', name: 'รวม' },
            { id: 'sold', name: 'ขาย' }, { id: 'remaining', name: 'คงเหลือ' }, { id: 'remarks', name: 'หมายเหตุ' }
        ];

        let thHtml = `<th width="40">ลำดับ</th><th>รายการ</th>`;
        recCols.forEach(c => thHtml += `<th>${c.name}</th>`);

        let trHtml = '';
        record.items.forEach((item, iIdx) => {
            let row = `<tr><td>${iIdx + 1}</td><td style="text-align:left; padding-left:10px;">${item.name}</td>`;
            recCols.forEach(c => {
                row += `<td>${item[c.id] || '-'}</td>`;
            });
            trHtml += row + `</tr>`;
        });

        html += `
        <div class="history-card" id="history-card-${idx}">
             <div class="history-header">
                 <div class="history-date" onclick="editHistoryDate(${idx})">📅 ${record.date} ✏️</div>
             </div>
             <div class="table-responsive">
                <table><thead><tr>${thHtml}</tr></thead><tbody>${trHtml}</tbody></table>
             </div>
             <div class="history-actions">
                 <button class="btn-copy" onclick="copyFromHistory(${idx})">📋 แก้ไขใหม่</button>
                 <button class="btn-export btn-export-excel" onclick="exportExcel(${idx})">📊 Excel</button>
                 <button class="btn-export btn-export-img" onclick="exportImage(${idx})">📸 รูปภาพ</button>
                 <button class="btn-icon danger" onclick="deleteHistoryRecord(${idx})" title="ลบประวัตินี้">🗑️</button>
             </div>
        </div>`;
    });
    list.innerHTML = html;
}

function clearHistory() {
    openConfirmModal(
        'ล้างประวัติทั้งหมด',
        'ประวัติการบันทึกสต็อกทั้งหมดจะถูกลบถาวร\nคุณยืนยันที่จะลบใช่หรือไม่?',
        'danger',
        () => {
            saveHistory([]);
            renderHistory();
        }
    );
}

function copyFromHistory(idx) {
    openConfirmModal(
        'คัดลอกข้อมูลกลับไปบันทึก',
        'ข้อมูลชุดนี้จะถูกคัดลอกกลับไปที่หน้าบันทึกปัจจุบัน\n(คุณสามารถแก้ไขและบันทึกทับใหม่ได้)',
        'info',
        () => {
            let rec = getHistory()[idx];
            if (rec.columns) saveColumns(rec.columns);
            saveItems(rec.items.map((i, arrayIndex) => ({ ...i, id: Date.now() + arrayIndex })));
            recalculateAllItems();
            switchPage('record');
            window.scrollTo(0, 0);
        }
    );
}

let currentEditHistoryIndex = null;

function editHistoryDate(idx) {
    const history = getHistory();
    currentEditHistoryIndex = idx;
    document.getElementById('editDateInput').value = history[idx].date;
    document.getElementById('editDateModal').classList.add('show');

    document.getElementById('btnConfirmEditDate').onclick = () => {
        const newDate = document.getElementById('editDateInput').value;
        if (newDate.trim() === "") return;

        history[currentEditHistoryIndex].date = newDate;
        saveHistory(history);
        renderHistory();
        closeEditDateModal();
    };
}

function closeEditDateModal() {
    document.getElementById('editDateModal').classList.remove('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

let currentEditItemIdx = null;
function openEditItemModal(idx) {
    let items = getItems();
    currentEditItemIdx = idx;
    document.getElementById('editItemInput').value = items[idx].name;
    document.getElementById('editItemModal').classList.add('show');

    document.getElementById('btnConfirmEditItem').onclick = () => {
        const newName = document.getElementById('editItemInput').value.trim();
        if (newName) {
            items[currentEditItemIdx].name = newName;
            saveItems(items);
            renderStock();
            closeModal('editItemModal');
        }
    };
}

let currentEditColId = null;
function openEditColumnModal(colId) {
    let cols = getColumns();
    currentEditColId = colId;
    let col = cols.find(c => c.id === colId);
    document.getElementById('editColumnInput').value = col.name;
    const btnDelete = document.getElementById('btnDeleteColumn');
        const isDefault = ['previous', 'received', 'total', 'sold', 'remaining', 'remarks'].includes(colId);

        if (btnDelete) {
            if (!isDefault) {
                btnDelete.style.display = 'block';
                btnDelete.onclick = () => {
                    closeModal('editColumnModal');
                    deleteColumn(colId); // เรียกใช้ฟังก์ชัน deleteColumn ที่มีอยู่แล้ว
                };
            } else {
                btnDelete.style.display = 'none'; // คอลัมน์พื้นฐานห้ามลบ
            }
        }
    // รีเซ็ต Dropdown ตัวเลือกคอลัมน์สำหรับการคำนวณ
    const calcCol1Opts = document.getElementById('calcCol1Options');
    const calcCol2Opts = document.getElementById('calcCol2Options');
    calcCol1Opts.innerHTML = '';
    calcCol2Opts.innerHTML = '';

    cols.forEach(c => {
        if (c.id !== colId) {
            calcCol1Opts.appendChild(createOptionLi(c.name, () => {
                document.getElementById('calcCol1').value = c.id;
                document.getElementById('selectedCalcCol1Text').innerText = c.name;
                calcCol1Opts.classList.remove('show');
            }));
            calcCol2Opts.appendChild(createOptionLi(c.name, () => {
                document.getElementById('calcCol2').value = c.id;
                document.getElementById('selectedCalcCol2Text').innerText = c.name;
                calcCol2Opts.classList.remove('show');
            }));
        }
    });

    if (col.calc) {
        document.getElementById('enableCalcToggle').checked = true;
        document.getElementById('calcCol1').value = col.calc.col1;
        document.getElementById('selectedCalcCol1Text').innerText = cols.find(c=>c.id===col.calc.col1)?.name || 'เลือกคอลัมน์ 1';
        document.getElementById('calcCol2').value = col.calc.col2;
        document.getElementById('selectedCalcCol2Text').innerText = cols.find(c=>c.id===col.calc.col2)?.name || 'เลือกคอลัมน์ 2';
        selectMathOp(col.calc.op);
    } else {
        document.getElementById('enableCalcToggle').checked = false;
        document.getElementById('calcCol1').value = '';
        document.getElementById('selectedCalcCol1Text').innerText = 'เลือกคอลัมน์ 1';
        document.getElementById('calcCol2').value = '';
        document.getElementById('selectedCalcCol2Text').innerText = 'เลือกคอลัมน์ 2';
        selectMathOp('+');
    }
    toggleCalcFields();
    document.getElementById('editColumnModal').classList.add('show');
    // นำโค้ดนี้ไปวางต่อจากฟังก์ชัน openEditColumnModal
    document.getElementById('btnConfirmEditColumn').onclick = () => {
        let cols = getColumns();
        let col = cols.find(c => c.id === currentEditColId);

        // 1. อัปเดตชื่อคอลัมน์
        let newColName = document.getElementById('editColumnInput').value.trim();
        if (newColName) {
            col.name = newColName;
        }

        // 2. อัปเดตการตั้งค่าคำนวณ
        let enableCalc = document.getElementById('enableCalcToggle').checked;
        if (enableCalc) {
            let c1 = document.getElementById('calcCol1').value;
            let c2 = document.getElementById('calcCol2').value;
            let op = document.getElementById('calcOperator').value;

            if (!c1 || !c2) {
                openConfirmModal('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกคอลัมน์สำหรับการคำนวณให้ครบทั้ง 2 ช่อง', 'warning', () => {});
                return;
            }

            col.calc = { col1: c1, col2: c2, op: op };
        } else {
            delete col.calc; // ลบการตั้งค่าคำนวณออกถ้าผู้ใช้ปิดสวิตช์
        }

        // 3. บันทึกและรีเฟรชตาราง
        saveColumns(cols);
        recalculateAllItems();
        renderThead();
        renderStock();
        closeModal('editColumnModal');
    };
}

function deleteHistoryRecord(idx) {
    const history = getHistory();
    const targetDate = history[idx].date;

    openConfirmModal(
        'ยืนยันการลบประวัติ',
        `คุณต้องการลบข้อมูลบันทึกของวันที่ \n"${targetDate}" ใช่หรือไม่?\n(ข้อมูลจะหายไปถาวร)`,
        'danger',
        () => {
            history.splice(idx, 1);
            saveHistory(history);
            renderHistory();
        }
    );
}

function exportExcel(idx) {
    try {
        let rec = getHistory()[idx];
        let recCols = rec.columns || [
            { id: 'previous', name: 'ยกมา' }, { id: 'received', name: 'รับเข้า' }, { id: 'total', name: 'รวม' },
            { id: 'sold', name: 'ขาย' }, { id: 'remaining', name: 'คงเหลือ' }, { id: 'remarks', name: 'หมายเหตุ' }
        ];

        const data = rec.items.map((item, i) => {
            let row = { "ลำดับ": i + 1, "รายการ": item.name };
            recCols.forEach(c => {
                row[c.name] = item[c.id] || "";
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock Data");

        const safeDateString = rec.date.replace(/[\/:\s]/g, '-');
        const fileName = `Stock_${currentZone}_${safeDateString}.xlsx`;

        if (window.AndroidApp) {
            const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            AndroidApp.saveExcelFile(base64Data, fileName);
        } else {
            XLSX.writeFile(wb, fileName);
        }

    } catch (error) {
        console.error("Excel Export Error:", error);
        openConfirmModal('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'danger', () => {});
    }
}

function exportImage(idx) {
    const el = document.getElementById(`history-card-${idx}`);
    if (!el) return;

    const btns = el.querySelector('.history-actions');
    btns.style.display = 'none';

    const tableResponsive = el.querySelector('.table-responsive');
    let originalOverflow = '';
    let originalTableWidth = '';
    let originalElWidth = '';

    if (tableResponsive) {
        originalOverflow = tableResponsive.style.overflowX;
        originalTableWidth = tableResponsive.style.width;
        originalElWidth = el.style.width;

        tableResponsive.style.overflowX = 'visible';
        tableResponsive.style.width = tableResponsive.scrollWidth + 'px';
        el.style.width = el.scrollWidth + 'px';
    }

    html2canvas(el, {
        backgroundColor: '#141414',
        scale: 2,
        useCORS: true
    }).then(canvas => {
        if (tableResponsive) {
            tableResponsive.style.overflowX = originalOverflow;
            tableResponsive.style.width = originalTableWidth;
            el.style.width = originalElWidth;
        }

        btns.style.display = 'flex';

        const fileName = `Stock_${currentZone}_${getHistory()[idx].date.replace(/[\/:\s]/g, '-')}.png`;
        const dataUrl = canvas.toDataURL('image/png');

        if (window.AndroidApp) {
            const base64Data = dataUrl.split(',')[1];
            AndroidApp.saveImageToGallery(base64Data, fileName);
        } else {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();
        }

    }).catch(err => {
        console.error("Image Export Error:", err);
        openConfirmModal('เกิดข้อผิดพลาด', 'มีข้อผิดพลาดในการสร้างรูปภาพ\nกรุณาลองใหม่อีกครั้ง', 'danger', () => {});

        if (tableResponsive) {
            tableResponsive.style.overflowX = originalOverflow;
            tableResponsive.style.width = originalTableWidth;
            el.style.width = originalElWidth;
        }
        btns.style.display = 'flex';
    });
}
// --- ระบบกรอกเลขด่วน (ดึงข้อมูลจากตารางจริง) ---

// --- ส่วนควบคุม Custom Dropdown (Quick Input) ---

// 1. ฟังก์ชัน เปิด/ปิด รายการ Dropdown
function toggleCustomSelect(id) {
    // ปิดอันอื่นที่อาจเปิดค้างไว้ก่อน
    document.querySelectorAll('.custom-options').forEach(el => {
        if (el.id !== id) el.classList.remove('show');
    });
    // สลับสถานะ (เปิด/ปิด) ของอันที่คลิก
    const target = document.getElementById(id);
    if (target) target.classList.toggle('show');
}

// 2. คลิกที่ว่างอื่นๆ นอก Dropdown ให้ปิดรายการอัตโนมัติ
window.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-options').forEach(el => {
            el.classList.remove('show');
        });
    }
});

// 3. ฟังก์ชันดึงข้อมูลจากตารางมาใส่ใน Custom Dropdown
function updateQuickInputDropdowns() {
    // 1. อ้างอิง Element ทั้งหมด (หน้าหลัก และ ใน Modal)
    const itemOptions = document.getElementById('itemOptions');
    const colOptions = document.getElementById('colOptions');
    const calcCol1Options = document.getElementById('calcCol1Options');
    const calcCol2Options = document.getElementById('calcCol2Options');

    if (!itemOptions || !colOptions) return;

    // ล้างค่าเก่าออกให้หมด
    [itemOptions, colOptions, calcCol1Options, calcCol2Options].forEach(el => {
        if(el) el.innerHTML = '';
    });

    const rows = document.querySelectorAll('#stock-list tr');
    if (rows.length === 0) return;

    // --- ส่วนที่ 1: รายการสินค้า (เฉพาะหน้าหลัก) ---
    rows.forEach((tr, index) => {
        let itemName = 'ไม่ทราบชื่อ';
        if (tr.cells[1]) {
            const nameInput = tr.cells[1].querySelector('input');
            itemName = nameInput ? nameInput.value : tr.cells[1].innerText.trim();
        }
        const li = createOptionLi(itemName, () => {
            document.getElementById('quickItemSelect').value = index;
            document.getElementById('selectedItemText').innerText = itemName;
            itemOptions.classList.remove('show');
        });
        itemOptions.appendChild(li);
    });

    // --- ส่วนที่ 2: รายการคอลัมน์ (ทั้งหน้าหลัก และ ใน Modal) ---
    const firstRow = rows[0];
    const inputs = firstRow.querySelectorAll('input:not([type="hidden"])');

    inputs.forEach(input => {
            const td = input.closest('td');
            if (td) {
                const cellIndex = td.cellIndex;
                const th = document.querySelector(`#dynamic-thead th:nth-child(${cellIndex + 1})`);
                const colName = th ? th.innerText.trim() : `คอลัมน์ ${cellIndex}`;

                // เพิ่มลงใน Dropdown หน้าหลัก (เก็บไว้)
                const liMain = createOptionLi(colName, () => {
                    document.getElementById('quickColSelect').value = cellIndex;
                    document.getElementById('selectedColText').innerText = colName;
                    colOptions.classList.remove('show');
                });
                colOptions.appendChild(liMain);

                // ❌ ลบส่วนที่เกี่ยวข้องกับ calcCol1Options และ calcCol2Options ทิ้งทั้งหมด
            }
        });
            }

            // 4. ฟังก์ชันช่วยสร้างแท็ก <li> เพื่อลดโค้ดซ้ำซ้อน
            function createOptionLi(text, clickHandler) {
                const li = document.createElement('li');
                li.innerText = text;
                li.onclick = clickHandler;
                return li;
            }

            // 5. ฟังก์ชันบันทึกค่าจากระบบกรอกเลขด่วนลงในตาราง
            function applyQuickInput() {
                const rowIndex = document.getElementById('quickItemSelect').value;
                const cellIndex = document.getElementById('quickColSelect').value;
                const valInput = document.getElementById('quickNumInput');
                const val = valInput.value;

                if (rowIndex === '' || cellIndex === '') {
                    openConfirmModal('แจ้งเตือน', 'กรุณาเลือกสินค้าและคอลัมน์ก่อนครับ', 'warning', () => {});
                    return;
                }

                if (val === '') {
                    valInput.focus();
                    return;
                }

                const rows = document.querySelectorAll('#stock-list tr');
                const targetRow = rows[rowIndex];

                if (targetRow) {
                    const targetCell = targetRow.cells[cellIndex];
                    if (targetCell) {
                        const targetInput = targetCell.querySelector('input');
                        if (targetInput) {
                            targetInput.value = val;
                            // สั่งให้ Logic การคำนวณในตารางทำงาน
                            targetInput.dispatchEvent(new Event('input', { bubbles: true }));

                            // เอฟเฟกต์กระพริบที่แถวเพื่อให้รู้ว่าบันทึกแล้ว
                            targetRow.style.transition = 'background 0.3s';
                            targetRow.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
                            setTimeout(() => targetRow.style.backgroundColor = '', 500);

                            // เคลียร์ช่องเลข และ focus รอรับตัวเลขถัดไป (กรณีอยากกรอกสินค้าอื่นในคอลัมน์เดิม)
                            valInput.value = '';
                            valInput.focus();
                        }
                    }
                }
            }

            // --- ส่วนควบคุม Custom Dropdown สำหรับ Modal เพิ่มคอลัมน์ใหม่ ---

            // ฟังก์ชันเลือกประเภทคอลัมน์
            function selectAddColType(value, text) {
                document.getElementById('addColType').value = value;
                document.getElementById('selectedAddColTypeText').innerText = text;
                document.getElementById('addColTypeOptions').classList.remove('show');
            }

            // ปรับปรุงฟังก์ชันเปิด Modal เพิ่มคอลัมน์ให้รีเซ็ต Custom UI ด้วย
            function openAddColumnModal() {
                document.getElementById('addColName').value = '';

                // รีเซ็ตค่าเริ่มต้นของประเภทคอลัมน์ (Custom UI)
                document.getElementById('addColType').value = 'number';
                document.getElementById('selectedAddColTypeText').innerText = '🔢 ประเภท: ตัวเลข (+/-)';

                document.getElementById('addColumnModal').classList.add('show');
                setTimeout(() => document.getElementById('addColName').focus(), 100);
            }