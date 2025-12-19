
const METHODS = {
  A: { name: "計算方法A", slope: 8.869, start: 10 },
  B: { name: "計算方法B", slope: 7.6, start: 24 },
  C: { name: "計算方法C", slope: 7.66, start: 24 },
  D: { name: "計算方法D", slope: 4.72, start: 30 },

};

const els = {
  pageSelect: document.getElementById("pageSelect"),
  pageCalc: document.getElementById("pageCalc"),
  toInput: document.getElementById("toInput"),
  back: document.getElementById("back"),
  clear: document.getElementById("clear"),
  rtInput: document.getElementById("rtInput"),
  resultValue: document.getElementById("resultValue"),
  formulaHelp: document.getElementById("formulaHelp"),
  offlineBadge: document.getElementById("offlineBadge"),
  swStatus: document.getElementById("swStatus"),
};

function getSelectedMethodKey() {
  const checked = document.querySelector('input[name="method"]:checked');
  return checked?.value ?? "A";
}

function showPage(which) {
  const isSelect = which === "select";
  els.pageSelect.hidden = !isSelect;
  els.pageCalc.hidden = isSelect;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "—";
  // 見やすさ優先：小数点以下は最大6桁
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function parseInput(str) {
  const raw = (str ?? "").trim();
  if (raw === "") return null;

  // 1) 全角→半角など最低限
  let s = raw.replace(/[，]/g, ",").replace(/[．]/g, ".").replace(/\s/g, "");

  // 2) もし「小数カンマ」っぽければカンマ→ドット（例: 1,23）
  //    それ以外は桁区切りとしてカンマ除去（例: 1,234.5）
  if (/^\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function updateFormulaHelp() {
  const key = getSelectedMethodKey();
  const m = METHODS[key];
  els.formulaHelp.textContent =
    `% CH3CN = ${m.slope} × rt + ${m.start}`;
}

function computeAndRender() {
  const key = getSelectedMethodKey();
  const m = METHODS[key];
  const rt = parseInput(els.rtInput.value);

  if (rt === null) {
    els.resultValue.textContent = "—";
    return;
  }

  const result = m.slope * rt + m.start;
  els.resultValue.textContent = formatNumber(result);
}

els.toInput.addEventListener("click", () => {
  showPage("calc");
  updateFormulaHelp();
  computeAndRender();
  setTimeout(() => els.rtInput.focus(), 50);
});

els.back.addEventListener("click", () => {
  showPage("select");
});

els.clear.addEventListener("click", () => {
  els.rtInput.value = "";
  computeAndRender();
  els.rtInput.focus();
});

document.querySelectorAll('input[name="method"]').forEach((r) => {
  r.addEventListener("change", () => {
    updateFormulaHelp();
    computeAndRender();
  });
});

els.rtInput.addEventListener("input", () => {
  computeAndRender();
});

// オフラインバッジ
function updateOnlineUI() {
  els.offlineBadge.hidden = navigator.onLine;
}
window.addEventListener("online", updateOnlineUI);
window.addEventListener("offline", updateOnlineUI);
updateOnlineUI();

// Service Worker 登録（更新が来たら分かるように表示も改善）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      els.swStatus.textContent = "オフライン対応: 有効";

      // 新しいSWが入ったら表示（iPhone含め “更新されてるのか不安” を減らす）
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              els.swStatus.textContent = "更新あり: 再読み込みで反映";
            } else {
              els.swStatus.textContent = "オフライン対応: 有効";
            }
          }
        });
      });

      // 明示的にチェック
      reg.update?.();
    } catch (e) {
      els.swStatus.textContent = "オフライン対応: 登録失敗";
      console.error(e);
    }
  });
} else {
  els.swStatus.textContent = "オフライン対応: 非対応ブラウザ";
}

