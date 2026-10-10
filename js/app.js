/* =========================================================
   Supabase設定
========================================================= */

const SUPABASE_URL = "https://pwgmsbzbnihnemveggsl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9yxCklCNudnEnIlWoGfRgw_kOLcbDxS";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

let currentUser = null;
let eventCategories = [];


/* =========================================================
   日付
========================================================= */

const today = new Date();

const weekNames = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
];

const todayDateElement = document.getElementById("todayDate");
if (todayDateElement) {
    todayDateElement.textContent =
        `${today.getFullYear()}年` +
        `${today.getMonth() + 1}月` +
        `${today.getDate()}日` +
        `（${weekNames[today.getDay()]}）`;
}


/* =========================================================
   Supabase認証・予定取得
========================================================= */

async function initializeSupabaseApp() {

    if (SUPABASE_URL === "YOUR_SUPABASE_URL" ||
        SUPABASE_PUBLISHABLE_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY") {

        showLoginError(
            "js/app.jsのSUPABASE_URLとSUPABASE_PUBLISHABLE_KEYを設定してください。"
        );

        return;
    }

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {

        showLoginError(
            "Supabaseへの接続に失敗しました。"
        );

        console.error(error);

        return;
    }

    currentUser = data.session?.user || null;

    if (currentUser) {

        document
            .getElementById("authModal")
            .classList.remove("show");

    }

    if (!currentUser) {

        document
            .getElementById("authModal")
            .classList.add("show");

        return;
    }

    if (document.getElementById("calendarGrid")) {
        await loadEventCategoriesFromSupabase();
        await loadEventsFromSupabase();
    }

    if (document.getElementById("todayScheduleList")) {
        await loadEventCategoriesFromSupabase();
        await loadHomeTodaySchedule();
    }

}


async function loginToSupabase() {

    const email =
        document
            .getElementById("loginEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;

    if (!email || !password) {

        showLoginError(
            "メールアドレスとパスワードを入力してください。"
        );

        return;
    }

    const button =
        document.getElementById("loginButton");

    button.disabled = true;
    button.textContent = "ログイン中…";

    hideLoginError();

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    button.disabled = false;
    button.textContent = "ログイン";

    if (error) {

        showLoginError(
            "ログインできませんでした。メールアドレスまたはパスワードを確認してください。"
        );

        console.error(error);

        return;
    }

    currentUser = data.user;

    document
        .getElementById("authModal")
        .classList.remove("show");

    if (document.getElementById("calendarGrid")) {
        await loadEventCategoriesFromSupabase();
        await loadEventsFromSupabase();
    }

    if (document.getElementById("todayScheduleList")) {
        await loadEventCategoriesFromSupabase();
        await loadHomeTodaySchedule();
    }

}


function showLoginError(message) {

    const error =
        document.getElementById("loginError");

    if (!error) return;

    error.textContent = message;
    error.style.display = "block";

}


function hideLoginError() {

    const error =
        document.getElementById("loginError");

    if (!error) return;

    error.textContent = "";
    error.style.display = "none";

}


function getEventCategory(categoryKey) {
    return eventCategories.find(category => category.category_key === categoryKey) || null;
}

function applyEventCategoryStyle(element, categoryKey, type = "label") {
    const category = getEventCategory(categoryKey);
    if (!element || !category) return;

    if (type === "dot") {
        if (category.text_color) element.style.backgroundColor = category.text_color;
        else if (category.color) element.style.backgroundColor = category.color;
        return;
    }

    if (category.color) element.style.backgroundColor = category.color;
    if (category.text_color) element.style.color = category.text_color;
}


async function loadEventCategoriesFromSupabase() {
    const select = document.getElementById("eventCategory");

    if (select) {
        select.disabled = true;
        select.innerHTML = '<option value="">カテゴリを読み込み中...</option>';
    }

    const { data, error } = await supabaseClient
        .from("event_categories")
        .select("category_key, category_name, sort_order, color, text_color")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("category_name", { ascending: true });

    if (error) {
        console.error("カテゴリの取得に失敗しました:", error);
        eventCategories = [];
        if (select) {
            select.innerHTML = '<option value="">カテゴリを取得できません</option>';
            select.disabled = true;
        }
        return;
    }

    eventCategories = data || [];

    if (!select) return;

    select.innerHTML = "";

    if (eventCategories.length === 0) {
        select.innerHTML = '<option value="">カテゴリが登録されていません</option>';
        select.disabled = true;
        return;
    }

    eventCategories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.category_key;
        option.textContent = category.category_name;
        select.appendChild(option);
    });

    select.disabled = false;
}


async function loadHomeTodaySchedule() {
    const list = document.getElementById("todayScheduleList");
    if (!list) return;

    list.replaceChildren();

    const { data, error } = await supabaseClient
        .from("family_events")
        .select("id, event_date, event_time, event_end_time, is_all_day, title, category")
        .eq("event_date", formatDate(new Date()))
        .order("event_time", { ascending: true, nullsFirst: false });

    if (error) {
        console.error("ホームの今日の予定を取得できませんでした:", error);
        const message = document.createElement("div");
        message.className = "schedule-empty";
        message.textContent = "今日の予定を取得できませんでした。";
        list.appendChild(message);
        return;
    }

    if (!data || data.length === 0) {
        const message = document.createElement("div");
        message.className = "schedule-empty";
        message.textContent = "今日の予定は登録されていません。";
        list.appendChild(message);
        return;
    }

    data.forEach(event => {
        const item = document.createElement("div");
        item.className = "schedule-item";

        const time = document.createElement("div");
        time.className = "schedule-time";
        time.textContent = event.is_all_day
            ? "終日"
            : formatEventTime(event.event_time, event.event_end_time) || "時間未設定";

        const details = document.createElement("div");
        const title = document.createElement("div");
        title.className = "schedule-title";
        title.textContent = event.title || "（予定名なし）";

        const note = document.createElement("div");
        note.className = "schedule-note";
        const category = eventCategories.find(
            item => item.category_key === event.category
        );
        note.textContent = category ? category.category_name : "カテゴリ未設定";
        applyEventCategoryStyle(note, event.category);

        details.append(title, note);
        item.append(time, details);
        list.appendChild(item);
    });
}


async function loadEventsFromSupabase() {
    const { data, error } = await supabaseClient
        .from("family_events")
        .select("id, event_date, event_time, event_end_time, is_all_day, title, category, recurrence_type, recurrence_until")
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });

    if (error) {
        alert("予定の取得に失敗しました。\n\n" + error.message + "\n\n新しい項目を追加するSQLをSupabaseで実行したか確認してください。");
        console.error(error);
        return;
    }

    eventRecords = data || [];
    refreshExpandedEvents();
    renderCalendar();
}

// 繰り返し予定は未来の行をDBに大量作成せず、必要な表示期間に合わせて都度展開します。
// そのため「5年先まで」などの固定上限はなく、カレンダーを何年先に移動しても表示できます。
function refreshExpandedEvents() {
    events = [];

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const viewStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    viewStart.setDate(viewStart.getDate() - 7);
    const viewEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 7);
    const isCurrentMonth = calendarDate.getFullYear() === today.getFullYear()
        && calendarDate.getMonth() === today.getMonth();
    const upcomingEnd = new Date(todayStart);
    upcomingEnd.setFullYear(upcomingEnd.getFullYear() + 1);
    const rangeStart = viewStart;
    const rangeEnd = isCurrentMonth && upcomingEnd > viewEnd ? upcomingEnd : viewEnd;

    eventRecords.forEach(event => {
        const recurrence = event.recurrence_type || "none";
        const base = {
            id: event.id,
            baseDate: event.event_date,
            time: event.is_all_day ? "" : formatEventTime(event.event_time, event.event_end_time),
            title: event.title,
            category: event.category,
            isAllDay: Boolean(event.is_all_day),
            recurrenceType: recurrence,
            isRecurring: recurrence !== "none"
        };
        const start = new Date(event.event_date + "T00:00:00");
        const explicitUntil = event.recurrence_until
            ? new Date(event.recurrence_until + "T00:00:00")
            : null;

        if (recurrence === "none") {
            if (start >= rangeStart && start <= rangeEnd) {
                events.push({ ...base, date: event.event_date });
            }
            return;
        }

        // 登録開始日より前には繰り返さず、終了日がある場合だけそこで停止します。
        let cursor = new Date(start);
        while (cursor <= rangeEnd && (!explicitUntil || cursor <= explicitUntil)) {
            if (cursor >= rangeStart && cursor >= start) {
                events.push({ ...base, date: formatDate(cursor) });
            }
            if (recurrence === "weekly") {
                cursor.setDate(cursor.getDate() + 7);
            } else if (recurrence === "monthly") {
                const day = start.getDate();
                const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
                cursor = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(day, lastDay));
            } else if (recurrence === "yearly") {
                const month = start.getMonth();
                const day = start.getDate();
                const year = cursor.getFullYear() + 1;
                const lastDay = new Date(year, month + 1, 0).getDate();
                cursor = new Date(year, month, Math.min(day, lastDay));
            } else {
                break;
            }
        }
    });
}

function formatEventTime(startTime, endTime) {
    const start = startTime ? startTime.slice(0, 5) : "";
    const end = endTime ? endTime.slice(0, 5) : "";
    if (start && end) return `${start}〜${end}`;
    return start || end || "";
}


/* =========================================================
   ページ間ナビゲーション
========================================================= */

function showPage(pageName) {
    const pageFiles = {
        home: "home.html",
        calendar: "calendar.html"
    };
    const targetFile = pageFiles[pageName];
    if (!targetFile) return;

    const currentFile = window.location.pathname.split("/").pop() || "index.html";
    if (currentFile !== targetFile) {
        window.location.href = targetFile;
        return;
    }

    if (pageName === "calendar") renderCalendar();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* PC・スマホ共通ナビ */
document.querySelectorAll(".nav-item[data-page], .mobile-nav-item[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

/* =========================================================
   Todo
========================================================= */

document
    .querySelectorAll(".todo input")
    .forEach(input => {

        input.addEventListener(
            "change",
            () => {

                input.parentElement
                    .classList.toggle(
                        "done",
                        input.checked
                    );

            }
        );

    });


function addTodo() {

    const text =
        prompt(
            "追加するTodoを入力してください"
        );

    if (!text) return;

    alert(
        `「${text}」を追加しました。\n\n` +
        `※現在はサンプル動作です。`
    );

}


function openRecord() {

    const text =
        prompt(
            "今日の記録を入力してください"
        );

    if (!text) return;

    alert(
        "記録しました。\n\n" +
        text +
        "\n\n" +
        "※現在はサンプル動作です。"
    );

}


/* =========================================================
   カレンダー データ
========================================================= */

let calendarDate =
    new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );


let selectedDate =
    formatDate(today);


/*
    予定データはSupabaseから取得する。
    categoryにはevent_categories.category_keyを保持する。
*/

let selectedEventForDetail = null;

let events = [];
let eventRecords = [];


/* =========================================================
   日付処理
========================================================= */

function formatDate(date) {

    const y =
        date.getFullYear();

    const m =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const d =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${y}-${m}-${d}`;
}


function getDateLabel(dateString) {

    const date =
        new Date(
            dateString + "T00:00:00"
        );

    return (
        `${date.getMonth() + 1}月` +
        `${date.getDate()}日` +
        `（${weekNames[date.getDay()]}）`
    );

}


/* =========================================================
   カレンダー描画
========================================================= */

function renderCalendar() {

    const grid = document.getElementById("calendarGrid");
    if (!grid) return;

    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();


    document
        .getElementById("currentMonth")
        .textContent =
            `${year}年${month + 1}月`;


    grid.innerHTML = "";


    const weekdays = [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土"
    ];


    weekdays.forEach(
        (day, index) => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "weekday " +
                (index === 0
                    ? "sun"
                    : index === 6
                    ? "sat"
                    : "");

            element.textContent =
                day;

            grid.appendChild(
                element
            );

        }
    );


    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const previousMonthDays =
        new Date(
            year,
            month,
            0
        ).getDate();


    const totalCells =
        Math.ceil(
            (firstDay + daysInMonth) / 7
        ) * 7;


    for (
        let i = 0;
        i < totalCells;
        i++
    ) {

        let dayNumber;

        let cellDate;

        let otherMonth = false;


        if (i < firstDay) {

            dayNumber =
                previousMonthDays -
                firstDay +
                i +
                1;

            cellDate =
                new Date(
                    year,
                    month - 1,
                    dayNumber
                );

            otherMonth = true;

        }

        else if (
            i >=
            firstDay + daysInMonth
        ) {

            dayNumber =
                i -
                firstDay -
                daysInMonth +
                1;

            cellDate =
                new Date(
                    year,
                    month + 1,
                    dayNumber
                );

            otherMonth = true;

        }

        else {

            dayNumber =
                i -
                firstDay +
                1;

            cellDate =
                new Date(
                    year,
                    month,
                    dayNumber
                );

        }


        const dateString =
            formatDate(cellDate);


        const cell =
            document.createElement(
                "div"
            );


        cell.className =
            "day-cell";


        if (otherMonth) {

            cell.classList.add(
                "other-month"
            );

        }


        if (
            dateString ===
            formatDate(today)
        ) {

            cell.classList.add(
                "today"
            );

        }


        if (
            dateString ===
            selectedDate
        ) {

            cell.classList.add(
                "selected"
            );

        }


        cell.onclick =
            () => {

                selectedDate =
                    dateString;

                renderCalendar();

                renderSelectedDay();

            };


        const number =
            document.createElement(
                "div"
            );

        number.className =
            "day-number";

        number.textContent =
            dayNumber;


        cell.appendChild(
            number
        );


        const dayEvents =
            events
                .filter(
                    event =>
                        event.date ===
                        dateString
                )
                .sort(
                    (a,b) =>
                        (a.time || "")
                        .localeCompare(
                            b.time || ""
                        )
                );


        dayEvents
            .slice(0, 3)
            .forEach(
                event => {

                    const element =
                        document.createElement(
                            "div"
                        );

                    element.className = "calendar-event";
                    applyEventCategoryStyle(element, event.category);

                    // カレンダーの日付枠には時刻ではなく予定タイトルを表示します。
                    element.textContent = event.title || "（予定名なし）";


                    element.onclick = (e) => {
                        e.stopPropagation();
                        openEventDetailModal(event);
                    };


                    cell.appendChild(
                        element
                    );

                }
            );


        if (
            dayEvents.length > 3
        ) {

            const more =
                document.createElement(
                    "div"
                );

            more.style.fontSize =
                "10px";

            more.style.color =
                "#999";

            more.textContent =
                `＋${dayEvents.length - 3}件`;


            cell.appendChild(
                more
            );

        }


        grid.appendChild(
            cell
        );

    }


    renderSelectedDay();

    renderUpcoming();

    renderMonthEvents();

}


/* =========================================================
   選択日の予定
========================================================= */

function renderSelectedDay() {

    const title =
        document.getElementById(
            "selectedDayTitle"
        );


    const eventsContainer =
        document.getElementById(
            "selectedDayEvents"
        );


    title.textContent =
        `${getDateLabel(selectedDate)} の予定`;


    eventsContainer.innerHTML = "";


    const dayEvents =
        events
            .filter(
                event =>
                    event.date ===
                    selectedDate
            )
            .sort(
                (a,b) =>
                    (a.time || "99:99")
                    .localeCompare(
                        b.time || "99:99"
                    )
            );


    if (!dayEvents.length) {

        eventsContainer.innerHTML = `

            <div
                style="
                padding:20px 0;
                color:#999;
                font-size:13px;
                ">

                この日の予定はありません。

            </div>

        `;

        return;

    }


    dayEvents.forEach(
        event => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "selected-event";


            const time =
                document.createElement(
                    "div"
                );

            time.className =
                "selected-event-time";

            time.textContent =
                event.time || "終日";


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "selected-event-name";

            name.textContent =
                event.title;


            const category =
                document.createElement(
                    "div"
                );

            category.className = "selected-event-category";
            category.textContent = getEventCategoryName(event.category);
            applyEventCategoryStyle(category, event.category);


            row.appendChild(time);

            row.appendChild(name);

            row.appendChild(category);

            eventsContainer.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   今後の予定
========================================================= */

function renderUpcoming() {

    const container =
        document.getElementById(
            "upcomingEvents"
        );


    container.innerHTML = "";


    const upcoming =
        [...events]
            .filter(
                event =>
                    event.date >=
                    formatDate(today)
            )
            .sort(
                (a,b) =>
                    a.date.localeCompare(
                        b.date
                    ) ||
                    (a.time || "")
                    .localeCompare(
                        b.time || ""
                    )
            )
            .slice(0, 7);


    upcoming.forEach(
        event => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "upcoming-item";


            const dot =
                document.createElement(
                    "div"
                );

            dot.className = "event-dot";
            applyEventCategoryStyle(dot, event.category, "dot");


            const content =
                document.createElement(
                    "div"
                );


            const date =
                document.createElement(
                    "div"
                );

            date.className =
                "upcoming-date";

            date.textContent =
                getDateLabel(
                    event.date
                );


            const title =
                document.createElement(
                    "div"
                );

            title.className =
                "upcoming-event-title";

            title.textContent =
                event.title;


            content.appendChild(
                date
            );

            content.appendChild(
                title
            );


            row.appendChild(
                dot
            );

            row.appendChild(
                content
            );


            container.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   今月のイベント
========================================================= */

function renderMonthEvents() {

    const container =
        document.getElementById(
            "monthEvents"
        );


    container.innerHTML = "";


    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();


    const prefix =
        `${year}-${String(
            month + 1
        ).padStart(2,"0")}`;


    const monthEvents =
        events
            .filter(
                event =>
                    event.date.startsWith(
                        prefix
                    )
            )
            .sort(
                (a,b) =>
                    a.date.localeCompare(
                        b.date
                    )
            )
            .slice(0,4);


    monthEvents.forEach(
        event => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "month-event-card";


            const category =
                document.createElement(
                    "div"
                );

            category.className = "month-event-category";
            category.textContent = getEventCategoryName(event.category);
            applyEventCategoryStyle(category, event.category);


            const date =
                document.createElement(
                    "div"
                );

            date.className =
                "month-event-date";

            date.textContent =
                event.date;


            const title =
                document.createElement(
                    "div"
                );

            title.className =
                "month-event-name";

            title.textContent =
                event.title;


            card.appendChild(
                category
            );

            card.appendChild(
                date
            );

            card.appendChild(
                title
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   月移動
========================================================= */

function changeMonth(offset) {

    calendarDate =
        new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth() + offset,
            1
        );


    refreshExpandedEvents();
    renderCalendar();

}


function goToday() {

    calendarDate =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );


    selectedDate =
        formatDate(today);


    refreshExpandedEvents();
    renderCalendar();

}


/* =========================================================
   表示切り替え
========================================================= */

function changeCalendarView(
    view,
    button
) {

    document
        .querySelectorAll(
            ".view-switch button"
        )
        .forEach(
            item => {

                item.classList.remove(
                    "active"
                );

            }
        );


    button.classList.add(
        "active"
    );


    if (view === "month") {

        renderCalendar();

        return;

    }


    if (view === "day") {

        renderSelectedDay();

        return;

    }


    if (view === "week") {

        alert(
            "週表示は次の実装で追加します。"
        );

    }

}


/* =========================================================
   予定詳細・削除
========================================================= */

// カテゴリ名はDBから取得したeventCategoriesを共通参照する。
// DBに存在しない古いカテゴリ値がある場合はキーを表示し、空欄にはしない。
function getEventCategoryName(categoryKey) {
    if (!categoryKey) return "未分類";

    const category = eventCategories.find(
        item => item.category_key === categoryKey
    );

    return category?.category_name || categoryKey;
}

function openEventDetailModal(event) {
    selectedEventForDetail = event;

    document.getElementById("detailEventTitle").textContent = event.title || "（予定名なし）";
    document.getElementById("detailEventDate").textContent = event.date || "日付なし";
    document.getElementById("detailEventTime").textContent = event.isAllDay ? "終日" : (event.time || "時刻指定なし");
    const detailCategory = document.getElementById("detailEventCategory");
    detailCategory.textContent = getEventCategoryName(event.category);
    detailCategory.style.backgroundColor = "";
    detailCategory.style.color = "";
    applyEventCategoryStyle(detailCategory, event.category);

    const deleteButton = document.getElementById("deleteEventButton");
    deleteButton.disabled = false;
    deleteButton.textContent = "予定を削除";

    document.getElementById("eventDetailModal").classList.add("show");
}

function closeEventDetailModal() {
    document.getElementById("eventDetailModal").classList.remove("show");
    selectedEventForDetail = null;
}

async function deleteSelectedEvent() {
    const event = selectedEventForDetail;

    if (!event || !event.id) {
        alert("削除する予定を特定できませんでした。カレンダーを再読み込みしてお試しください。");
        return;
    }

    if (!currentUser) {
        alert("ログイン状態を確認できません。もう一度ログインしてください。");
        closeEventDetailModal();
        document.getElementById("authModal").classList.add("show");
        return;
    }

    const deleteMessage = event.isRecurring
        ? `「${event.title}」の繰り返し予定をすべて削除しますか？\nこの操作は取り消せません。`
        : `「${event.title}」を削除しますか？\nこの操作は取り消せません。`;
    const confirmed = window.confirm(deleteMessage);
    if (!confirmed) return;

    const button = document.getElementById("deleteEventButton");
    button.disabled = true;
    button.textContent = "削除中…";

    try {
        const { data, error } = await supabaseClient
            .from("family_events")
            .delete()
            .eq("id", event.id)
            .eq("user_id", currentUser.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("予定が削除されませんでした。ログイン状態やデータベースの権限設定を確認してください。");
        }

        eventRecords = eventRecords.filter(item => item.id !== event.id);
        refreshExpandedEvents();
        closeEventDetailModal();
        renderCalendar();
    } catch (error) {
        console.error("予定の削除に失敗しました:", error);
        alert("予定の削除に失敗しました。\n\n" + (error.message || "原因不明のエラー"));
        button.disabled = false;
        button.textContent = "予定を削除";
    }
}

/* =========================================================
   予定入力・複数日一括登録
========================================================= */
let entryCalendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
let selectedEntryDates = [];

function openEventModal() {
    selectedEntryDates = [selectedDate || formatDate(today)];
    entryCalendarDate = new Date(selectedEntryDates[0] + "T00:00:00");
    entryCalendarDate = new Date(entryCalendarDate.getFullYear(), entryCalendarDate.getMonth(), 1);
    document.getElementById("bulkModeToggle").checked = false;
    document.getElementById("eventTime").value = "10:00";
    document.getElementById("eventEndTime").value = "11:00";
    document.getElementById("eventAllDay").checked = false;
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventRecurrence").value = "none";
    toggleAllDay();
    renderEntryCalendar();
    document.getElementById("eventModal").classList.add("show");
}

function closeEventModal() {
    document.getElementById("eventModal").classList.remove("show");
}

function toggleBulkMode() {
    const bulk = document.getElementById("bulkModeToggle").checked;
    if (bulk) {
        if (!selectedEntryDates.length) selectedEntryDates = [selectedDate || formatDate(today)];
        document.getElementById("entryCalendarHelp").textContent = "日付をタップして複数選択。もう一度タップすると選択解除できます。";
    } else {
        const keep = selectedEntryDates[0] || selectedDate || formatDate(today);
        selectedEntryDates = [keep];
        document.getElementById("entryCalendarHelp").textContent = "予定を登録する日を選んでください。";
    }
    syncSelectedEntryDate();
    renderEntryCalendar();
}

function toggleAllDay() {
    const allDay = document.getElementById("eventAllDay").checked;
    document.getElementById("startTimeGroup").classList.toggle("time-fields-hidden", allDay);
    document.getElementById("endTimeGroup").classList.toggle("time-fields-hidden", allDay);
    document.getElementById("eventTime").disabled = allDay;
    document.getElementById("eventEndTime").disabled = allDay;
}

function changeEntryMonth(offset) {
    entryCalendarDate = new Date(entryCalendarDate.getFullYear(), entryCalendarDate.getMonth() + offset, 1);
    renderEntryCalendar();
}

function syncSelectedEntryDate() {
    if (selectedEntryDates.length) {
        document.getElementById("eventDate").value = selectedEntryDates[0];
    }
}

function renderEntryCalendar() {
    const grid = document.getElementById("entryCalendarGrid");
    if (!grid) return;
    const year = entryCalendarDate.getFullYear();
    const month = entryCalendarDate.getMonth();
    document.getElementById("entryMonthLabel").textContent = `${year}年${month + 1}月`;
    grid.innerHTML = "";
    ["日", "月", "火", "水", "木", "金", "土"].forEach((name, i) => {
        const cell = document.createElement("div");
        cell.className = "entry-weekday" + (i === 0 ? " sun" : i === 6 ? " sat" : "");
        cell.textContent = name;
        grid.appendChild(cell);
    });
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement("div");
        blank.className = "entry-day blank";
        grid.appendChild(blank);
    }
    for (let day = 1; day <= days; day++) {
        const date = formatDate(new Date(year, month, day));
        const button = document.createElement("button");
        button.type = "button";
        button.className = "entry-day";
        if (date === formatDate(today)) button.classList.add("today");
        if (selectedEntryDates.includes(date)) button.classList.add("selected");
        button.textContent = String(day);
        button.setAttribute("aria-pressed", selectedEntryDates.includes(date) ? "true" : "false");
        button.addEventListener("click", () => {
            if (document.getElementById("bulkModeToggle").checked) {
                if (selectedEntryDates.includes(date)) selectedEntryDates = selectedEntryDates.filter(item => item !== date);
                else selectedEntryDates.push(date);
            } else {
                selectedEntryDates = [date];
            }
            selectedEntryDates.sort();
            syncSelectedEntryDate();
            renderEntryCalendar();
        });
        grid.appendChild(button);
    }
    document.getElementById("entryCalendarHelp").textContent = document.getElementById("bulkModeToggle").checked
        ? `複数の日付を選択中です（${selectedEntryDates.length}日）。`
        : "予定を登録する日を選んでください。";
}

async function saveEvent() {
    const bulk = document.getElementById("bulkModeToggle").checked;
    const dates = [...new Set(selectedEntryDates)].sort();
    const allDay = document.getElementById("eventAllDay").checked;
    const startTime = allDay ? null : (document.getElementById("eventTime").value || null);
    const endTime = allDay ? null : (document.getElementById("eventEndTime").value || null);
    const title = document.getElementById("eventTitle").value.trim();
    const category = document.getElementById("eventCategory").value;
    const recurrence = document.getElementById("eventRecurrence").value || "none";

    if (!dates.length) { alert("カレンダーで予定を登録する日を選んでください。"); return; }
    if (!title) { alert("予定名を入力してください。"); return; }
    if (!category) { alert("カテゴリを選択してください。カテゴリ一覧を取得できない場合は、ページを再読み込みしてください。"); return; }
    if (!allDay && startTime && endTime && endTime < startTime) { alert("終了時刻は開始時刻以降にしてください。"); return; }
    if (!currentUser) { document.getElementById("authModal").classList.add("show"); return; }

    const button = document.querySelector("#eventModal .save-button");
    if (button) { button.disabled = true; button.textContent = "保存中…"; }
    const rows = dates.map(date => ({
        user_id: currentUser.id,
        event_date: date,
        event_time: startTime,
        event_end_time: endTime,
        is_all_day: allDay,
        title,
        category,
        recurrence_type: recurrence,
        recurrence_until: null
    }));

    try {
        const { data, error } = await supabaseClient
            .from("family_events")
            .insert(rows)
            .select("id, event_date, event_time, event_end_time, is_all_day, title, category, recurrence_type, recurrence_until");
        if (error) throw error;
        eventRecords = eventRecords.concat(data || []);
        refreshExpandedEvents();
        renderCalendar();
        selectedDate = dates[0];
        calendarDate = new Date(selectedDate + "T00:00:00");
        calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
        refreshExpandedEvents();
        closeEventModal();
        renderCalendar();
        if (bulk && dates.length > 1) alert(`${dates.length}日分の予定を登録しました。`);
    } catch (error) {
        console.error("予定の保存に失敗しました:", error);
        alert("予定の保存に失敗しました。\n\n" + (error.message || "原因不明のエラー") + "\n\n必要なデータベース項目が追加されているか、同梱のSQLを確認してください。");
    } finally {
        if (button) { button.disabled = false; button.textContent = "保存"; }
    }
}

const eventDetailModalElement = document.getElementById("eventDetailModal");
if (eventDetailModalElement) {
    eventDetailModalElement.addEventListener("click", function(e) {
        if (e.target === this) closeEventDetailModal();
    });
}

/* =========================================================
   モーダル外クリック
========================================================= */

const eventModalElement = document.getElementById("eventModal");
if (eventModalElement) {
    eventModalElement.addEventListener("click", function(e) {
        if (e.target === this) closeEventModal();
    });
}


/* =========================================================
   初期化
========================================================= */

initializeSupabaseApp();

const loginPasswordElement = document.getElementById("loginPassword");
if (loginPasswordElement) {
    loginPasswordElement.addEventListener("keydown", function(e) {
        if (e.key === "Enter") loginToSupabase();
    });
}
