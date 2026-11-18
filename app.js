
/****************************************************
 * NICHA SPA
 * Booking & Revenue Management
 * Frontend: GitHub Pages
 * Backend: Google Apps Script
 ****************************************************/

let state = {
  beds: [],
  employees: [],
  services: [],
  bookings: []
};

const ACTIVE_BOOKINGS_KEY = 'nicha_active_bookings';


/* ---------------- UTILITIES ---------------- */

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function money(value) {
  return Number(value || 0).toLocaleString('th-TH');
}

function isActive(value) {
  return value === true ||
    String(value).toLowerCase() === 'true' ||
    value === 1 ||
    String(value) === '1';
}

function getActiveBookings() {
  try {
    return JSON.parse(
      localStorage.getItem(ACTIVE_BOOKINGS_KEY) || '{}'
    );
  } catch {
    return {};
  }
}

function saveActiveBookings(data) {
  localStorage.setItem(
    ACTIVE_BOOKINGS_KEY,
    JSON.stringify(data)
  );
}


/* ---------------- LOGIN ---------------- */

async function login() {
  const pin = document.getElementById('pin')?.value || '';
  const msg = document.getElementById('msg');

  try {
    msg.textContent = 'กำลังเข้าสู่ระบบ...';

    const result = await api('login', { pin });

    if (!result.ok) {
      msg.textContent = result.error || 'รหัสผ่านไม่ถูกต้อง';
      return;
    }

    sessionStorage.setItem('nicha_token', result.token);

    document.getElementById('login').hidden = true;
    document.getElementById('app').hidden = false;

    await refresh();
    show('beds');

  } catch (error) {
    msg.textContent =
      'เชื่อมต่อระบบไม่สำเร็จ: ' + error.message;
  }
}


/* ---------------- LOAD DATA ---------------- */

async function refresh() {
  const result = await api('init');

  if (!result.ok) {
    throw new Error(
      result.error || 'โหลดข้อมูลไม่สำเร็จ'
    );
  }

  state = {
    ...state,
    ...result
  };

  state.beds = result.beds || [];
  state.employees = result.employees || [];
  state.services = result.services || [];
  state.bookings = result.bookings || [];

  return state;
}


/* ---------------- NAVIGATION ---------------- */

function show(page) {
  const heading = document.getElementById('heading');
  const content = document.getElementById('content');

  if (!heading || !content) return;

  if (page === 'beds') renderBeds();
  if (page === 'staff') renderStaff();
  if (page === 'services') renderServices();
  if (page === 'report') renderReport();
}


/* ---------------- BEDS ---------------- */

function renderBeds() {
  const heading = document.getElementById('heading');
  const content = document.getElementById('content');

  heading.textContent = 'จัดการเตียงและรับลูกค้า';

  const beds = state.beds.filter(b =>
    isActive(b.active)
  );

  const free = beds.filter(
    b => b.status === 'ว่าง'
  ).length;

  const busy = beds.filter(
    b => b.status === 'กำลังนวด'
  ).length;

  content.innerHTML = `
    <div class="grid">

      <div class="tile">
        <small>เตียงทั้งหมด</small>
        <h2>${beds.length}</h2>
      </div>

      <div class="tile">
        <small>เตียงว่าง</small>
        <h2>${free}</h2>
      </div>

      <div class="tile">
        <small>กำลังนวด</small>
        <h2>${busy}</h2>
      </div>

    </div>

    <h3>เลือกเตียงเพื่อรับลูกค้า</h3>

    <div class="grid">

      ${beds.map(bed => {

        const isBusy = bed.status === 'กำลังนวด';

        return `

          <div class="tile bed-tile"
               style="
                 cursor:pointer;
                 border:2px solid ${isBusy ? '#16a34a' : '#d1d5db'};
                 background:${isBusy ? '#16a34a' : '#ffffff'};
                 color:${isBusy ? '#ffffff' : '#374151'};
                 transition:all .25s ease;
                 border-radius:14px;
               "
               onclick="openBed('${escapeHTML(bed.id)}')">

            <h2 style="color:inherit">
              ${escapeHTML(bed.name)}
            </h2>

            <p>${escapeHTML(bed.area || '')}</p>

            <span style="
              display:inline-block;
              padding:6px 14px;
              border-radius:20px;
              background:${isBusy ? '#ffffff' : '#f3f4f6'};
              color:${isBusy ? '#15803d' : '#374151'};
              font-weight:bold;
            ">
              ${isBusy ? 'กำลังนวด ✓' : 'ว่าง'}
            </span>

            <p style="color:inherit">
              ${isBusy ? 'กดเพื่อดูงาน' : 'กดเพื่อรับลูกค้า'}
            </p>

          </div>

        `;

      }).join('')}

    </div>

    <h3>เพิ่มเตียง</h3>

    <input
      id="bedname"
      placeholder="ชื่อเตียง เช่น เตียง 7"
    >

    <select id="area">
      <option value="ห้องหลัก">ห้องหลัก</option>
      <option value="ห้อง Aroma">ห้อง Aroma</option>
    </select>

    <button onclick="addBed()">
      บันทึกเตียง
    </button>
  `;
}


/* ---------------- OPEN BED ---------------- */

function openBed(bedId) {

  const bed = state.beds.find(
    b => String(b.id) === String(bedId)
  );

  if (!bed) {
    alert('ไม่พบข้อมูลเตียง');
    return;
  }

  if (bed.status === 'กำลังนวด') {
    showBusyBed(bed);
    return;
  }

  showBookingForm(bed);
}


/* ---------------- BOOKING FORM ---------------- */

function showBookingForm(bed) {

  const content = document.getElementById('content');

  const employees = state.employees.filter(
    e => isActive(e.active)
  );

  const services = state.services.filter(
    s => isActive(s.active)
  );

  content.innerHTML = `

    <div class="tile">

      <h2>รับลูกค้าเข้าร้าน</h2>

      <p>
        เตียง: <b>${escapeHTML(bed.name)}</b>
      </p>

      <p>${escapeHTML(bed.area || '')}</p>

      <label>ประเภทลูกค้า</label>

      <select id="customerType">
        <option value="ขาจร">ลูกค้าขาจร</option>
        <option value="ประจำ">ลูกค้าประจำ</option>
      </select>

      <label>ชื่อลูกค้า</label>

      <input
        id="customerName"
        placeholder="กรอกชื่อลูกค้า"
      >

      <label>เลือกพนักงานนวด</label>

      <select id="employeeId">

        <option value="">-- เลือกพนักงาน --</option>

        ${employees.map(e => `
          <option value="${escapeHTML(e.id)}">
            ${escapeHTML(e.name)}
            (${escapeHTML(e.type)})
          </option>
        `).join('')}

      </select>

      <label>เลือกคอร์สนวด</label>

      <select
        id="serviceId"
        onchange="updateBookingPrice()"
      >

        <option value="">-- เลือกบริการ --</option>

        ${services.map(s => `
          <option
            value="${escapeHTML(s.id)}"
            data-price="${Number(s.price)}"
          >
            ${escapeHTML(s.name)}
            · ${s.minutes} นาที
            · ${money(s.price)} บาท
          </option>
        `).join('')}

      </select>

      <label>ราคา (บาท)</label>

      <input
        id="bookingPrice"
        type="number"
        min="0"
        placeholder="ราคา"
      >

      <label>ส่วนลด (บาท)</label>

      <input
        id="bookingDiscount"
        type="number"
        min="0"
        value="0"
      >

      <div class="tile">
        <small>ยอดสุทธิ</small>
        <h2 id="bookingNet">0 บาท</h2>
      </div>

      <button
        id="startBookingButton"
        onclick="startBooking('${escapeHTML(bed.id)}')"
      >
        เริ่มงานนวด
      </button>

      <button onclick="show('beds')">
        ย้อนกลับ
      </button>

    </div>
  `;

  document
    .getElementById('bookingPrice')
    .addEventListener('input', calculateNet);

  document
    .getElementById('bookingDiscount')
    .addEventListener('input', calculateNet);
}


function updateBookingPrice() {

  const select = document.getElementById('serviceId');

  const option = select.options[select.selectedIndex];

  document.getElementById('bookingPrice').value =
    option?.dataset.price || '';

  calculateNet();
}


function calculateNet() {

  const price = Number(
    document.getElementById('bookingPrice')?.value || 0
  );

  const discount = Number(
    document.getElementById('bookingDiscount')?.value || 0
  );

  const net = Math.max(0, price - discount);

  const output = document.getElementById('bookingNet');

  if (output) {
    output.textContent = money(net) + ' บาท';
  }
}


/* ---------------- START BOOKING ---------------- */

async function startBooking(bedId) {

  const employeeId =
    document.getElementById('employeeId').value;

  const serviceId =
    document.getElementById('serviceId').value;

  const customerName =
    document.getElementById('customerName').value.trim();

  const customerType =
    document.getElementById('customerType').value;

  const price =
    Number(document.getElementById('bookingPrice').value || 0);

  const discount =
    Number(document.getElementById('bookingDiscount').value || 0);

  if (!employeeId) {
    return alert('กรุณาเลือกพนักงานนวด');
  }

  if (!serviceId) {
    return alert('กรุณาเลือกคอร์สนวด');
  }

  if (price <= 0) {
    return alert('กรุณาระบุราคา');
  }

  if (discount < 0 || discount > price) {
    return alert('ส่วนลดไม่ถูกต้อง');
  }

  const booking = {
    bedId,
    employeeId,
    serviceId,
    customerName,
    customerType,
    price,
    discount
  };

  const button = document.getElementById(
    'startBookingButton'
  );

  try {

    if (button) {
      button.disabled = true;
      button.textContent = 'กำลังเริ่มงาน...';
    }

    const result = await api('startBooking', {
      booking
    });

    if (!result.ok) {

      if (button) {
        button.disabled = false;
        button.textContent = 'เริ่มงานนวด';
      }

      alert(result.error || 'ไม่สามารถเริ่มงานได้');
      return;
    }

    const active = getActiveBookings();

    active[String(bedId)] = result.bookingId;

    saveActiveBookings(active);

    // เปลี่ยนปุ่มเป็นสีเขียวเมื่อเริ่มงานสำเร็จ
    if (button) {
      button.style.background = '#16a34a';
      button.style.color = '#ffffff';
      button.textContent = 'กำลังนวด ✓';
    }

    alert('เริ่มงานนวดเรียบร้อยแล้ว');

    await refresh();

    show('beds');

  } catch (error) {

    if (button) {
      button.disabled = false;
      button.textContent = 'เริ่มงานนวด';
    }

    alert('เกิดข้อผิดพลาด: ' + error.message);
  }
}


/* ---------------- BUSY BED ---------------- */

function showBusyBed(bed) {

  const content = document.getElementById('content');

  const active = getActiveBookings();

  const bookingId = active[String(bed.id)];

  content.innerHTML = `

    <div class="tile"
         style="
           border:2px solid #16a34a;
           background:#16a34a;
           color:#ffffff;
         ">

      <h2 style="color:#ffffff">
        ${escapeHTML(bed.name)}
      </h2>

      <p>
        สถานะ:
        <b>กำลังนวด ✓</b>
      </p>

      ${
        bookingId
          ? `
            <p>
              หมายเลขงาน:
              ${escapeHTML(bookingId)}
            </p>

            <button
              onclick="finishBooking('${escapeHTML(bed.id)}')"
            >
              จบงานและคิดเงิน
            </button>
          `
          : `
            <p>ไม่พบหมายเลขงานในเบราว์เซอร์นี้</p>
            <p>กรุณาตรวจสอบรายการงานกับผู้ดูแลก่อนปิดงาน</p>
          `
      }

      <button onclick="show('beds')">
        ย้อนกลับ
      </button>

    </div>
  `;
}


/* ---------------- FINISH BOOKING ---------------- */

async function finishBooking(bedId) {

  const active = getActiveBookings();

  const bookingId = active[String(bedId)];

  if (!bookingId) {
    alert('ไม่พบหมายเลขงาน');
    return;
  }

  const paymentMethod = prompt(
    'ระบุวิธีชำระเงิน: เงินสด / โอนเงิน',
    'เงินสด'
  );

  if (!paymentMethod) return;

  if (
    !confirm('ยืนยันจบงานและบันทึกการชำระเงินหรือไม่?')
  ) {
    return;
  }

  try {

    const result = await api('finishBooking', {
      bookingId,
      paymentMethod
    });

    if (!result.ok) {
      alert(result.error || 'ไม่สามารถปิดงานได้');
      return;
    }

    delete active[String(bedId)];

    saveActiveBookings(active);

    alert(
      'ชำระเงินเรียบร้อย\n' +
      'ยอดสุทธิ: ' + money(result.net) + ' บาท\n' +
      'ส่วนร้าน: ' + money(result.shop) + ' บาท\n' +
      'ส่วนเจ้าของ: ' + money(result.owner) + ' บาท\n' +
      'ส่วนพนักงาน: ' + money(result.staff) + ' บาท'
    );

    await refresh();

    // โหลดเตียงใหม่ สีเขียวจะกลับเป็นสีขาว
    show('beds');

  } catch (error) {

    alert('เกิดข้อผิดพลาด: ' + error.message);
  }
}


/* ---------------- EMPLOYEES ---------------- */

function renderStaff() {

  const heading = document.getElementById('heading');

  const content = document.getElementById('content');

  heading.textContent = 'จัดการพนักงาน';

  content.innerHTML = `

    ${(state.employees || []).map(e => `

      <div class="tile">

        <b>${escapeHTML(e.name)}</b>

        <p>${escapeHTML(e.type)}</p>

        <p>
          ร้าน ${e.shareShop}% /
          เจ้าของ ${e.shareOwner}% /
          พนักงาน ${e.shareStaff}%
        </p>

      </div>

    `).join('')}

    <h3>เพิ่มพนักงาน</h3>

    <input
      id="ename"
      placeholder="ชื่อพนักงาน"
    >

    <select id="etype">
      <option value="ประจำ">ประจำ</option>
      <option value="พาร์ทไทม์">พาร์ทไทม์</option>
    </select>

    <div class="grid">

      <input
        id="shop"
        type="number"
        value="40"
        placeholder="ร้าน %"
      >

      <input
        id="owner"
        type="number"
        value="10"
        placeholder="เจ้าของ %"
      >

      <input
        id="staff"
        type="number"
        value="50"
        placeholder="พนักงาน %"
      >

    </div>

    <button onclick="addEmployee()">
      บันทึกพนักงาน
    </button>
  `;
}


async function addEmployee() {

  const employee = {

    name: document.getElementById('ename').value.trim(),

    type: document.getElementById('etype').value,

    shareShop: document.getElementById('shop').value,

    shareOwner: document.getElementById('owner').value,

    shareStaff: document.getElementById('staff').value

  };

  if (!employee.name) {
    return alert('กรุณากรอกชื่อพนักงาน');
  }

  const total =
    Number(employee.shareShop) +
    Number(employee.shareOwner) +
    Number(employee.shareStaff);

  if (total !== 100) {
    return alert('สัดส่วนต้องรวมกันเท่ากับ 100%');
  }

  try {

    const result = await api('saveEmployee', {
      employee
    });

    if (!result.ok) {
      return alert(result.error);
    }

    await refresh();

    show('staff');

  } catch (error) {

    alert(error.message);
  }
}


/* ---------------- SERVICES ---------------- */

function renderServices() {

  const heading = document.getElementById('heading');

  const content = document.getElementById('content');

  heading.textContent = 'เมนูบริการ';

  content.innerHTML = `

    ${(state.services || []).map(s => `

      <div class="tile">

        <b>${escapeHTML(s.name)}</b>

        <p>
          ${s.minutes} นาที ·
          ${money(s.price)} บาท
        </p>

      </div>

    `).join('')}

    <h3>เพิ่มบริการ</h3>

    <input
      id="sname"
      placeholder="ชื่อบริการ"
    >

    <div class="grid">

      <input
        id="mins"
        type="number"
        placeholder="นาที"
      >

      <input
        id="price"
        type="number"
        placeholder="ราคา"
      >

    </div>

    <button onclick="addService()">
      บันทึกบริการ
    </button>
  `;
}


async function addService() {

  const service = {

    name: document.getElementById('sname').value.trim(),

    minutes: document.getElementById('mins').value,

    price: document.getElementById('price').value

  };

  if (
    !service.name ||
    Number(service.minutes) <= 0 ||
    Number(service.price) <= 0
  ) {
    return alert('กรุณากรอกข้อมูลบริการให้ครบ');
  }

  try {

    const result = await api('saveService', {
      service
    });

    if (!result.ok) {
      return alert(result.error);
    }

    await refresh();

    show('services');

  } catch (error) {

    alert(error.message);
  }
}


/* ---------------- ADD BED ---------------- */

async function addBed() {

  const name = document.getElementById('bedname').value.trim();

  const area = document.getElementById('area').value;

  if (!name) {
    return alert('กรุณากรอกชื่อเตียง');
  }

  try {

    const result = await api('saveBed', {
      bed: { name, area }
    });

    if (!result.ok) {
      return alert(result.error);
    }

    await refresh();

    show('beds');

  } catch (error) {

    alert(error.message);
  }
}


/* ---------------- REPORT ---------------- */

async function renderReport() {

  const heading = document.getElementById('heading');

  const content = document.getElementById('content');

  heading.textContent = 'รายงานรายได้';

  content.innerHTML = '<p>กำลังโหลดรายงาน...</p>';

  try {

    const result = await api('report');

    if (!result.ok) {

      content.innerHTML =
        '<p>ไม่สามารถโหลดรายงานได้</p>';

      return;
    }

    content.innerHTML = `

      <div class="grid">

        <div class="tile">
          <small>ยอดรับชำระ</small>
          <h2>${money(result.total)} ฿</h2>
        </div>

        <div class="tile">
          <small>ส่วนร้าน</small>
          <h2>${money(result.shop)} ฿</h2>
        </div>

        <div class="tile">
          <small>ส่วนเจ้าของ</small>
          <h2>${money(result.owner)} ฿</h2>
        </div>

        <div class="tile">
          <small>ค่ามือพนักงาน</small>
          <h2>${money(result.staff)} ฿</h2>
        </div>

      </div>
    `;

  } catch (error) {

    content.innerHTML =
      '<p>เกิดข้อผิดพลาด: ' +
      escapeHTML(error.message) +
      '</p>';

  }
}


/* ---------------- LOGOUT ---------------- */

function logout() {

  sessionStorage.removeItem('nicha_token');

  location.reload();
}
