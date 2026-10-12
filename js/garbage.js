let month = new Date(today.getFullYear(), today.getMonth(), 1);
let selected = days(1);
let pendingDates = [];
const data = {};

for (let day = 1; day <= 31; day++) {
  const date = new Date(today.getFullYear(), today.getMonth(), day);
  if (date.getMonth() !== today.getMonth()) break;

  if ([1, 4].includes(date.getDay())) data[key(date)] = ["burn"];
  if (date.getDay() === 3) data[key(date)] = ["recycle"];
}
data[days(1)] = ["burn"];

const names = {
  burn: "燃えるごみ",
  recycle: "資源ごみ",
  nonburn: "燃えないごみ"
};

function renderCalendar() {
  $("month").textContent = `${month.getFullYear()}年${month.getMonth() + 1}月`;
  $("calendar").replaceChildren();

  ["日", "月", "火", "水", "木", "金", "土"].forEach((weekday) => {
    const element = document.createElement("div");
    element.className = "weekday";
    element.textContent = weekday;
    $("calendar").append(element);
  });

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  for (let index = 0; index < firstDay + daysInMonth; index++) {
    const date = new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1);
    const dateKey = key(date);
    const button = document.createElement("button");
    button.className = "day" +
      (date.getMonth() !== month.getMonth() ? " other" : "") +
      (dateKey === key(today) ? " today" : "") +
      (dateKey === selected ? " selected" : "") +
      (pendingDates.includes(dateKey) ? " pending-date" : "");
    button.textContent = date.getDate();

    (data[dateKey] || []).forEach((type) => {
      const dot = document.createElement("i");
      dot.className = "dot " + type;
      button.append(dot);
    });

    button.onclick = () => {
      selected = dateKey;
      $("date").value = dateKey;
      renderCalendar();
    };
    $("calendar").append(button);
  }

  $("selectedTitle").textContent = label(selected) + "の収集予定";
  const types = data[selected] || [];
  $("selectedTypes").textContent = types.length
    ? types.map((type) => names[type]).join("・")
    : "収集予定はありません";
  if (!$('date').value) $("date").value = selected;
  renderPendingDates();
}

function renderPendingDates() {
  const container = $("selectedDates");
  container.replaceChildren();
  if (!pendingDates.length) {
    const note = document.createElement("span");
    note.className = "muted";
    note.textContent = "登録する日付がまだ選択されていません。";
    container.append(note);
    return;
  }

  pendingDates.forEach((dateKey) => {
    const chip = document.createElement("span");
    chip.className = "date-chip";
    chip.textContent = label(dateKey);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chip-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", label(dateKey) + "を選択から外す");
    remove.onclick = () => {
      pendingDates = pendingDates.filter((date) => date !== dateKey);
      renderPendingDates();
      renderCalendar();
    };
    chip.append(remove);
    container.append(chip);
  });
}

$("prev").onclick = () => {
  month.setMonth(month.getMonth() - 1);
  renderCalendar();
};
$("next").onclick = () => {
  month.setMonth(month.getMonth() + 1);
  renderCalendar();
};

$("addDate").onclick = () => {
  const dateKey = $("date").value;
  if (!dateKey) {
    toast("日付を選択してください");
    return;
  }
  if (!pendingDates.includes(dateKey)) pendingDates.push(dateKey);
  pendingDates.sort();
  selected = dateKey;
  month = new Date(dateKey + "T00:00:00");
  month.setDate(1);
  renderCalendar();
};

$("addForm").onsubmit = (event) => {
  event.preventDefault();
  if (!pendingDates.length) {
    toast("先に登録する日付を追加してください");
    return;
  }

  const type = $("type").value;
  pendingDates.forEach((dateKey) => {
    data[dateKey] = [...new Set([...(data[dateKey] || []), type])];
  });
  selected = pendingDates[pendingDates.length - 1];
  month = new Date(selected + "T00:00:00");
  month.setDate(1);
  const count = pendingDates.length;
  pendingDates = [];
  renderCalendar();
  toast(`${count}日分の収集日を登録しました`);
};

renderCalendar();
