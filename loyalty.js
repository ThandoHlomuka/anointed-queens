/* ============================================================
   ANNOINTED QUEENS - loyalty + referrals (Anointed Club)
   ============================================================ */
window.LOYALTY = (function () {
  var DB = window.AQDB, AQ = window.AQ;

  function renderHist(list) {
    return list.length ? list.map(function (t) {
      var pos = t.delta >= 0;
      return '<div class="row" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap">' +
        '<div><b>' + window.esc(t.reason || 'Points') + '</b><div class="muted" style="font-size:.8rem">' + new Date(t.created_at).toLocaleDateString() + '</div></div>' +
        '<b style="color:' + (pos ? 'var(--success)' : 'var(--danger)') + '">' + (pos ? '+' : '') + t.delta + ' pts</b></div>';
    }).join('') : '<p class="muted">No points activity yet.</p>';
  }

  async function render() {
    var u = window.AQAuth.currentUser();
    var bal = await DB.loyaltyBalance();
    var hist = await DB.loyaltyHist();
    var ref = await DB.myReferral();

    document.getElementById('loyBody').innerHTML =
      '<div class="wrap section" style="padding-top:28px"><h1>Anointed Club</h1>' +
      '<div class="grid-bes" style="align-items:start">' +
        '<div class="panel" style="background:radial-gradient(circle at 80% 10%, rgba(212,175,55,.25), transparent 55%), var(--black-2)">' +
          '<span class="eyebrow">Your balance</span>' +
          '<div style="font-family:var(--font-display);font-size:3rem;color:var(--gold-bright);line-height:1">' + bal.toLocaleString() + '</div>' +
          '<div class="muted" style="font-size:.9rem">points</div>' +
          '<div class="row" style="margin-top:16px"><span class="muted">1 point = ' + window.fmtMoney(AQ.LOYALTY.redeemRate) + ' at checkout</span></div>' +
          '<div class="row" style="margin-top:10px"><span class="badge gold"><i class="fas fa-wand-magic-sparkles"></i> ' + Math.round(AQ.LOYALTY.perSpend * 100) + ' pts per R100</span>' +
          '<span class="badge green">+' + AQ.LOYALTY.perReview + ' per review</span><span class="badge blue">+' + AQ.LOYALTY.perReferral + ' per referral</span></div>' +
        '</div>' +
        '<div class="panel"><h3>Refer & earn</h3>' +
          '<p class="muted" style="font-size:.9rem">Share your royal code - you both earn ' + AQ.LOYALTY.perReferral + ' points on their first order.</p>' +
          (ref && ref.code
            ? '<div class="row"><input class="input" id="refCode" style="max-width:220px" value="' + window.esc(ref.code) + '" readonly>' +
              '<button class="btn btn-outline" id="copyRef"><i class="fas fa-copy"></i> Copy</button></div>' +
              '<p class="muted" style="font-size:.84rem">Share: <span class="gold">' + u.email + '</span></p>'
            : '<div class="row"><input class="input" id="refNew" style="max-width:220px" placeholder="Create a code e.g. QUEENNOMVULA">' +
              '<button class="btn btn-primary" id="saveRef">Activate</button></div>') +
        '</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:18px"><h3>Points history</h3>' + renderHist(hist) + '</div></div>';

    var copy = document.getElementById('copyRef');
    if (copy) copy.addEventListener('click', function () {
      document.getElementById('refCode').select();
      try { navigator.clipboard.writeText(document.getElementById('refCode').value); } catch (e) {}
      window.toast('Code copied', 'green');
    });
    var save = document.getElementById('saveRef');
    if (save) save.addEventListener('click', async function () {
      var code = document.getElementById('refNew').value.trim();
      if (!/^[A-Z0-9]{4,12}$/i.test(code)) { window.toast('Code must be 4-12 letters/numbers', 'err'); return; }
      await DB.setReferral(code.toUpperCase()); render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('loyBody')) return;
    if (!window.AQAuth.ensureClientOnly()) return;
    render();
  });
  return { renderHist: renderHist };
})();