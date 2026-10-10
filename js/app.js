/* =========================================================
   Supabase設定
========================================================= */

const SUPABASE_URL = "https://pwgmsbzbnihnemveggsl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

let currentUser = null;


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

document.getElementById("todayDate").textContent =
    `${today.getFullYear()}年` +
    `${today.getMonth() + 1}月` +
    `${today.getDate()}日` +
    `（${weekNames[today.getDay()]}）`;


/* =========================================================
   Supabase認証・予定取得
========================================================= */

async function initializeSupabaseApp() {

    if (SUPABASE_URL === "YOUR_SUPABASE_URL" ||
        SUPABASE_PUBLISHABLE_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY") {

        showLoginError(
            "index.htmlのSUPABASE_URLとSUPABASE_PUBLISHABLE_KEYを設定してください。"
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

    await loadEventsFromSupabase();

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

    await loadEventsFromSupabase();

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


async function loadEventsFromSupabase() {

    const { data, error } =
        await supabaseClient
            .from("family_events")
            .select("id, event_date, event_time, title, category")
            .order("event_date", { ascending: true })
            .order("event_time", { ascending: true });

    if (error) {

        alert(
            "予定の取得に失敗しました。\n\n" +
            error.message
        );

        console.error(error);

        return;
    }

    events = (data || []).map(event => ({
        id: event.id,
        date: event.event_date,
        time: event.event_time ? event.event_time.slice(0, 5) : "",
        title: event.title,
        category: event.category
    }));

    renderCalendar();

}


/* =========================================================
   ページ切り替え
========================================================= */

function showPage(pageName) {

    const pageMap = {
        home: "homePage",
        calendar: "calendarPage"
    };

    const targetPageId = pageMap[pageName];

    if (!targetPageId) {
        return;
    }

    document
        .querySelectorAll(".page")
        .forEach(page => {
            page.classList.remove("active");
        });


    const targetPage =
        document.getElementById(targetPageId);

    if (!targetPage) {
        return;
    }

    targetPage.classList.add("active");


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageName
            );

        });


    document
        .querySelectorAll(".mobile-nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageName
            );

        });


    if (pageName === "calendar") {

        renderCalendar();

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* PCナビ */

document
    .querySelectorAll(".nav-item[data-page]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.page
                );

            }
        );

    });


/* スマホナビ */

document
    .querySelectorAll(".mobile-nav-item[data-page]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.page
                );

            }
        );

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
    後でここをSupabaseから取得する。

    形式：

    {
        id: 1,
        date: "2026-10-06",
        time: "08:30",
        title: "保育園",
        category: "child"
    }
*/

let selectedEventForDetail = null;

let events = [];


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

    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();


    document
        .getElementById("currentMonth")
        .textContent =
            `${year}年${month + 1}月`;


    const grid =
        document.getElementById(
            "calendarGrid"
        );


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

                    element.className =
                        `calendar-event ${event.category}`;

                    element.textContent =
                        event.time
                            ? `${event.time} ${event.title}`
                            : event.title;


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

            category.className =
                `selected-event-category ${event.category}`;


            const categoryNames = {

                child: "子ども",
                family: "家族",
                work: "仕事",
                home: "家",
                travel: "旅行",
                pet: "ペット"

            };


            category.textContent =
                categoryNames[
                    event.category
                ];


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

            dot.className =
                `event-dot ${event.category}`;


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

            category.className =
                `month-event-category ${event.category}`;

            const categoryNames = {

                child: "子ども",
                family: "家族",
                work: "仕事",
                home: "家",
                travel: "旅行",
                pet: "ペット"

            };

            category.textContent =
                categoryNames[
                    event.category
                ];


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

const eventCategoryLabels = {
    child: "子ども",
    family: "家族",
    work: "仕事",
    home: "家",
    travel: "旅行",
    pet: "ペット"
};

function openEventDetailModal(event) {
    selectedEventForDetail = event;

    document.getElementById("detailEventTitle").textContent = event.title || "（予定名なし）";
    document.getElementById("detailEventDate").textContent = event.date || "日付なし";
    document.getElementById("detailEventTime").textContent = event.time || "時刻指定なし";
    document.getElementById("detailEventCategory").textContent = eventCategoryLabels[event.category] || event.category || "未分類";

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

    const confirmed = window.confirm(`「${event.title}」を削除しますか？\nこの操作は取り消せません。`);
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

        events = events.filter(item => item.id !== event.id);
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
   予定追加
========================================================= */

function openEventModal() {

    const modal =
        document.getElementById(
            "eventModal"
        );


    document.getElementById(
        "eventDate"
    ).value =
        selectedDate;


    document.getElementById(
        "eventTitle"
    ).value = "";


    modal.classList.add(
        "show"
    );

}


function closeEventModal() {

    document
        .getElementById(
            "eventModal"
        )
        .classList.remove(
            "show"
        );

}


async function saveEvent() {

    const date =
        document.getElementById(
            "eventDate"
        ).value;

    const time =
        document.getElementById(
            "eventTime"
        ).value;

    const title =
        document.getElementById(
            "eventTitle"
        ).value.trim();

    const category =
        document.getElementById(
            "eventCategory"
        ).value;


    if (!date || !title) {

        alert(
            "日付と予定を入力してください。"
        );

        return;

    }


    if (!currentUser) {

        document
            .getElementById("authModal")
            .classList.add("show");

        return;

    }


    const button =
        document.querySelector(
            "#eventModal .save-button"
        );

    if (button) {
        button.disabled = true;
        button.textContent = "保存中…";
    }


    const { data, error } =
        await supabaseClient
            .from("family_events")
            .insert({
                user_id: currentUser.id,
                event_date: date,
                event_time: time || null,
                title: title,
                category: category
            })
            .select("id, event_date, event_time, title, category")
            .single();


    if (button) {
        button.disabled = false;
        button.textContent = "保存";
    }


    if (error) {

        alert(
            "予定の保存に失敗しました。\n\n" +
            error.message
        );

        console.error(error);

        return;

    }


    events.push({
        id: data.id,
        date: data.event_date,
        time: data.event_time
            ? data.event_time.slice(0, 5)
            : "",
        title: data.title,
        category: data.category
    });


    selectedDate = date;

    calendarDate =
        new Date(
            date + "T00:00:00"
        );

    calendarDate =
        new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth(),
            1
        );


    closeEventModal();

    renderCalendar();

}


document.getElementById("eventDetailModal").addEventListener("click", function(e) {
    if (e.target === this) closeEventDetailModal();
});

/* =========================================================
   モーダル外クリック
========================================================= */

document
    .getElementById("eventModal")
    .addEventListener(
        "click",
        function(e) {

            if (
                e.target === this
            ) {

                closeEventModal();

            }

        }
    );


/* =========================================================
   初期化
========================================================= */

initializeSupabaseApp();

document
    .getElementById("loginPassword")
    .addEventListener("keydown", function(e) {

        if (e.key === "Enter") {
            loginToSupabase();
        }

    });
