/* AQ head injector (one-time, idempotent).
   Adds to every public page:
   - <link rel="canonical"> + description + og/twitter social-previews in <head>
   - polyfill.js loaded FIRST (before all other scripts)
   - floating share widget host + shares.js loader just before </body>
   Uses <!-- AQ:... --> markers so re-runs are safe. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://anointed-queens.vercel.app';
const V = '2';

const PAGES = {
  'index.html': { title: 'Anointed Queens - Handcrafted Custom Bags, Crowning Every Occasion', desc: 'Anointed Queens handcrafts bespoke custom bags in full-grain leather and gold hardware. Design your own, escrow protected, delivered to your door.' },
  'shop.html': { title: 'Shop the Collection | Anointed Queens', desc: 'Browse the Anointed Queens collection - totes, clutches, satchels, mini bags, crossbodies and backpacks, handcrafted in full-grain leather with gold hardware.' },
  'product.html': { title: 'Bespoke Custom Bags | Anointed Queens', desc: 'Explore each handcrafted Anointed Queens bag - full-grain leather, antique gold hardware, reviews from verified buyers and optional extras.' },
  'configurator.html': { title: 'Design Your Own Custom Bag | Anointed Queens', desc: 'Design a one-of-a-kind Anointed Queens bag - pick your style, leather, colour, size, hardware and personalisation. 50% deposit opens production, escrow protected.' },
  'cart.html': { title: 'Your Bag | Anointed Queens', desc: 'Review your Anointed Queens bag before secure, escrow-protected checkout.' },
  'checkout.html': { title: 'Secure Checkout | Anointed Queens', desc: 'Pay safely at Anointed Queens. Bespoke pieces are held in escrow until you approve the finished bag.' },
  'orders.html': { title: 'Orders & Tracking | Anointed Queens', desc: 'Track your Anointed Queens orders and bespoke design requests with live escrow status.' },
  'wishlist.html': { title: 'Wishlist | Anointed Queens', desc: 'Your saved Anointed Queens designs, ready when you are.' },
  'loyalty.html': { title: 'Anointed Club - Rewards & Referrals | Anointed Queens', desc: 'Earn Anointed Club points on every order, redeem rewards and gift friends R150 with your referral code.' },
  'login.html': { title: 'Sign In | Anointed Queens', desc: 'Sign in to your Anointed Queens account to track orders, designs and rewards.' },
  'register.html': { title: 'Create an Account | Anointed Queens', desc: 'Join the Anointed Queens family - order bespoke bags, earn rewards and manage your wishes.' },
  'account.html': { title: 'My Account | Anointed Queens', desc: 'Manage your Anointed Queens profile, wishlist and contact details.' },
  'about.html': { title: 'Our Story | Anointed Queens', desc: 'Anointed Queens is a custom bag house crafting one-of-a-kind leather pieces, crowned in gold, made to be kept forever.' },
  'journal.html': { title: 'The Journal | Anointed Queens', desc: 'Stories and craft notes from the Anointed Queens atelier - leather care, design inspiration and bespoke journeys.' },
  'faq.html': { title: 'FAQs | Anointed Queens', desc: 'Orders, bespoke process, escrow protection, shipping and returns - everything about Anointed Queens in one place.' },
  'contact.html': { title: 'Contact Us | Anointed Queens', desc: 'Talk to the Anointed Queens atelier about bespoke commissions, events and wholesale.' },
  'loyalty.html.bak': null
};
delete PAGES['loyalty.html.bak'];

const IMG = SITE + '/assets/icon-512-maskable.png';

for (const file of Object.keys(PAGES)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) { console.log('SKIP (missing): ' + file); continue; }
  let html = fs.readFileSync(fp, 'utf8');
  const meta = PAGES[file];
  const canonical = SITE + '/' + (file === 'index.html' ? '' : file);
  const changed = [];

  const seoBlock =
    '<!-- AQ:SEO -->\n' +
    '  <link rel="canonical" href="' + canonical + '">\n' +
    '  <meta name="description" content="' + meta.desc + '">\n' +
    '  <meta name="theme-color" content="#0A0A0A">\n' +
    '  <meta property="og:type" content="website">\n' +
    '  <meta property="og:site_name" content="Anointed Queens">\n' +
    '  <meta property="og:title" content="' + meta.title + '">\n' +
    '  <meta property="og:description" content="' + meta.desc + '">\n' +
    '  <meta property="og:url" content="' + canonical + '">\n' +
    '  <meta property="og:image" content="' + IMG + '">\n' +
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <meta name="twitter:title" content="' + meta.title + '">\n' +
    '  <meta name="twitter:description" content="' + meta.desc + '">\n' +
    '  <meta name="twitter:image" content="' + IMG + '">\n' +
    '  <!-- /AQ:SEO -->';

  if (html.indexOf('<!-- AQ:SEO -->') === -1) {
    html = html.replace('</head>', seoBlock + '\n</head>');
    changed.push('seo');
  } else {
    html = html.replace(/<!-- AQ:SEO -->[\s\S]*?<!-- \/AQ:SEO -->/, seoBlock);
    changed.push('seo-updated');
  }

  if (html.indexOf('AQ:SCRIPTS') === -1) {
    html = html.replace('<head>', '<head>\n  <script src="polyfill.js?v=' + V + '"></script>\n  <!-- AQ:SCRIPTS -->');
    changed.push('polyfill');
  }

  const shareBlock =
    '<!-- AQ:SHARE -->\n  <div data-share aria-hidden="true"></div>\n  <script src="shares.js?v=' + V + '"></script>\n  <!-- /AQ:SHARE -->';
  if (html.indexOf('<!-- AQ:SHARE -->') === -1) {
    html = html.replace('</body>', shareBlock + '\n</body>');
    changed.push('share');
  }

  fs.writeFileSync(fp, html);
  console.log('OK  ' + file + '  [' + changed.join(', ') + ']');
}
console.log('Injection complete.');