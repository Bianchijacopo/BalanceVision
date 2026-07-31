import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

function AnnotatedShot({ img, alt, markers, legend, intro }) {
  return (
    <div className="guide-shot">
      <div className="guide-shot-img">
        <img src={'/screenshots/' + img + '.png'} alt={alt} loading="lazy" />
        {markers.map(m => (
          <span
            key={m.n}
            className="guide-marker"
            style={{ left: m.left + '%', top: m.top + '%' }}
          >
            {m.n}
          </span>
        ))}
      </div>
      <div className="guide-shot-body">
        {intro && <p className="guide-shot-intro">{intro}</p>}
        <ol className="guide-legend">
          {legend.map((l, i) => (
            <li key={i} className="guide-legend-item">
              <span className="guide-legend-num">{i + 1}</span>
              <span>{l}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function Guide() {
  const { t, lang, setLang } = useLanguage();
  const g = t('guide');

  const loginMarkers = [
    { n: 1, left: 97.3, top: 4.1 },
    { n: 2, left: 50, top: 42.1 },
    { n: 3, left: 50, top: 51.7 },
    { n: 4, left: 50, top: 58.3 },
    { n: 5, left: 50, top: 63.5 },
    { n: 6, left: 55.4, top: 68.5 },
    { n: 7, left: 60.2, top: 78.7 },
    { n: 8, left: 40.7, top: 83.9 },
  ];

  const dashMarkers = [
    { n: 1, left: 50, top: 3.4 },
    { n: 2, left: 89.5, top: 3.4 },
    { n: 3, left: 93.3, top: 3.4 },
    { n: 4, left: 96.9, top: 3.4 },
    { n: 5, left: 50, top: 30 },
    { n: 6, left: 50, top: 57.1 },
    { n: 7, left: 50, top: 74.6 },
  ];

  const txMarkers = [
    { n: 1, left: 50, top: 11.5 },
    { n: 2, left: 50, top: 17.7 },
    { n: 3, left: 50, top: 27 },
    { n: 4, left: 3.6, top: 94.4 },
  ];

  const menuMarkers = [
    { n: 1, left: 61, top: 50 },
    { n: 2, left: 57.7, top: 62.1 },
    { n: 3, left: 50, top: 67.1 },
    { n: 4, left: 42.3, top: 62.1 },
    { n: 5, left: 39, top: 50 },
    { n: 6, left: 42.3, top: 37.9 },
    { n: 7, left: 50, top: 32.9 },
    { n: 8, left: 57.7, top: 37.9 },
  ];

  return (
    <div className="guide-page">
      <button
        onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
        className="theme-toggle lang-switch-top"
        title={lang === 'it' ? 'Switch to English' : 'Passa all\'italiano'}
        style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}
      >
        {lang === 'it' ? 'EN' : 'IT'}
      </button>

      <div className="guide-header">
        <h1 className="guide-title gradient-title">{g.title}</h1>
        <p className="guide-subtitle">{g.subtitle}</p>
        <Link to="/login" className="link guide-back">{g.backToLogin}</Link>
      </div>

      <div className="guide-cards">
        <div className="guide-card">
          <h2>{g.introTitle}</h2>
          <p>{g.intro}</p>
        </div>
        <div className="guide-card">
          <h2>{g.howToTitle}</h2>
          <p>{g.howTo}</p>
        </div>
        <div className="guide-card guide-card-accent">
          <h2>{g.otpTitle}</h2>
          <p>{g.otpText}</p>
        </div>
      </div>

      <h2 className="guide-section-title">{g.loginShotTitle}</h2>
      <AnnotatedShot img="01-login" alt="Login" markers={loginMarkers} legend={g.loginShotLegend} />

      <h2 className="guide-section-title">{g.dashShotTitle}</h2>
      <AnnotatedShot img="03-dashboard" alt="Dashboard" markers={dashMarkers} legend={g.dashShotLegend.slice(0, 7)} />

      <h2 className="guide-section-title">2b. {lang === 'it' ? 'Le transazioni' : 'Transactions'}</h2>
      <AnnotatedShot
        img="03b-dashboard-transactions"
        alt="Transazioni"
        markers={txMarkers}
        legend={[
          ...g.dashShotLegend.slice(7, 9),
          lang === 'it' ? 'La lista di tutte le transazioni, con categorie e importi' : 'The list of all transactions, with categories and amounts',
          lang === 'it' ? 'Scarica un report in PDF' : 'Download a PDF report',
        ]}
      />

      <h2 className="guide-section-title">{g.menuShotTitle}</h2>
      <AnnotatedShot img="04-menu-circolare" alt="Menu" markers={menuMarkers} legend={g.menuShotLegend} intro={g.menuShotIntro} />

      <h2 className="guide-section-title">{g.otpShotTitle}</h2>
      <div className="guide-shot">
        <div className="guide-shot-img">
          <img src="/screenshots/02-verify-email-otp.png" alt="OTP" loading="lazy" />
        </div>
        <div className="guide-shot-body">
          <p className="guide-shot-intro">{g.otpShotDesc}</p>
        </div>
      </div>

      <h2 className="guide-section-title">{g.pagesTitle}</h2>
      <p className="guide-pages-intro">{g.pagesIntro}</p>
      <div className="guide-pages">
        {g.pages.map((p, i) => (
          <div className="guide-page-card" key={i}>
            <div className="guide-page-img">
              <img src={'/screenshots/' + p.img + '.png'} alt={p.name} loading="lazy" />
            </div>
            <div className="guide-page-body">
              <h3>{i + 1}. {p.name}</h3>
              <p>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="guide-footer">
        <Link to="/login" className="link guide-back">{g.backToLogin}</Link>
      </div>
    </div>
  );
}
