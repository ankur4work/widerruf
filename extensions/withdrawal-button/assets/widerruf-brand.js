// Hides the "Powered by Widerruf" brand tag when the shop is on the Pro plan.
// Free plan: the tag stays visible (default).
(function () {
  var el = document.querySelector(".widerruf-brand");
  if (!el) return;
  try {
    fetch("/apps/withdrawal/status", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.pro) el.style.display = "none";
      })
      .catch(function () {});
  } catch (e) {}
})();
