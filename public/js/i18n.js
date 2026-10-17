// Small set of UI strings per language. Long-form answers come from the model in the chosen language.
export const HTML_LANG = { en: 'en', hi: 'hi', pa: 'pa', hing: 'hi-Latn' };

export const TAB_IDS = ['saathi', 'earnings', 'safety', 'rights', 'docs', 'grievance', 'sos'];
export const TAB_ICONS = { saathi: '😊', earnings: '💰', safety: '🛡️', rights: '📜', docs: '📄', grievance: '✉️', sos: '🆘' };

export const T = {
  en: {
    tabs: { saathi: 'Saathi', earnings: 'Earnings', safety: 'Safety', rights: 'Rights', docs: 'Documents', grievance: 'Complaint', sos: 'SOS' },
    greet: ['Good morning', 'Good afternoon', 'Good evening'],
    tagline: 'How is the road today?',
    streak: n => `${n}-day streak`,
    sosMsg: '🆘 I need help. My live location: {url}. Please call me or come now.',
    fakeLine: 'Hello? Where are you? Please come home right now, it is urgent.',
    checklist: [
      'Move to a safe spot and switch on hazard lights.',
      'Call 108 if anyone is hurt and 112 for police.',
      'Take photos of the vehicles, the road and any injuries.',
      'Do not argue. Exchange phone numbers.',
      'Tell the platform in writing today and keep a screenshot of the app.',
      'Get a medical check even if you feel fine.',
    ],
  },
  hi: {
    tabs: { saathi: 'साथी', earnings: 'कमाई', safety: 'सुरक्षा', rights: 'अधिकार', docs: 'दस्तावेज़', grievance: 'शिकायत', sos: 'SOS' },
    greet: ['सुप्रभात', 'नमस्ते', 'शुभ संध्या'],
    tagline: 'आज सड़क कैसी है?',
    streak: n => `${n} दिन लगातार`,
    sosMsg: '🆘 मुझे मदद चाहिए। मेरी लोकेशन: {url}। कृपया फ़ोन करें या अभी आएँ।',
    fakeLine: 'हैलो? तुम कहाँ हो? अभी घर आ जाओ, ज़रूरी है।',
    checklist: [
      'सुरक्षित जगह पर रुकें और हैज़र्ड लाइट चालू करें।',
      'कोई घायल हो तो 108 और पुलिस के लिए 112 पर कॉल करें।',
      'गाड़ियों, सड़क और चोटों की फोटो लें।',
      'बहस न करें। फ़ोन नंबर लें और दें।',
      'आज ही प्लेटफ़ॉर्म को लिखित में बताएँ और ऐप का स्क्रीनशॉट रखें।',
      'ठीक लगे तब भी डॉक्टर से जाँच कराएँ।',
    ],
  },
  pa: {
    tabs: { saathi: 'ਸਾਥੀ', earnings: 'ਕਮਾਈ', safety: 'ਸੁਰੱਖਿਆ', rights: 'ਹੱਕ', docs: 'ਦਸਤਾਵੇਜ਼', grievance: 'ਸ਼ਿਕਾਇਤ', sos: 'SOS' },
    greet: ['ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'ਸ਼ੁਭ ਸ਼ਾਮ'],
    tagline: 'ਅੱਜ ਸੜਕ ਕਿਵੇਂ ਹੈ?',
    streak: n => `${n} ਦਿਨ ਲਗਾਤਾਰ`,
    sosMsg: '🆘 ਮੈਨੂੰ ਮਦਦ ਚਾਹੀਦੀ ਹੈ। ਮੇਰੀ ਲੋਕੇਸ਼ਨ: {url}। ਕਿਰਪਾ ਕਰਕੇ ਫ਼ੋਨ ਕਰੋ ਜਾਂ ਹੁਣੇ ਆਓ।',
    fakeLine: 'ਹੈਲੋ? ਤੂੰ ਕਿੱਥੇ ਹੈਂ? ਹੁਣੇ ਘਰ ਆ ਜਾ, ਜ਼ਰੂਰੀ ਹੈ।',
    checklist: [
      'ਸੁਰੱਖਿਅਤ ਥਾਂ ਰੁਕੋ ਅਤੇ ਹੈਜ਼ਰਡ ਲਾਈਟਾਂ ਚਾਲੂ ਕਰੋ।',
      'ਕੋਈ ਜ਼ਖ਼ਮੀ ਹੋਵੇ ਤਾਂ 108 ਅਤੇ ਪੁਲਿਸ ਲਈ 112 ’ਤੇ ਕਾਲ ਕਰੋ।',
      'ਗੱਡੀਆਂ, ਸੜਕ ਅਤੇ ਸੱਟਾਂ ਦੀਆਂ ਫ਼ੋਟੋਆਂ ਲਵੋ।',
      'ਬਹਿਸ ਨਾ ਕਰੋ। ਫ਼ੋਨ ਨੰਬਰ ਲਓ-ਦਿਓ।',
      'ਅੱਜ ਹੀ ਪਲੇਟਫ਼ਾਰਮ ਨੂੰ ਲਿਖਤੀ ਦੱਸੋ ਅਤੇ ਐਪ ਦਾ ਸਕ੍ਰੀਨਸ਼ਾਟ ਰੱਖੋ।',
      'ਠੀਕ ਲੱਗੇ ਤਾਂ ਵੀ ਡਾਕਟਰ ਤੋਂ ਜਾਂਚ ਕਰਵਾਓ।',
    ],
  },
  hing: {
    tabs: { saathi: 'Saathi', earnings: 'Kamai', safety: 'Suraksha', rights: 'Adhikaar', docs: 'Documents', grievance: 'Shikayat', sos: 'SOS' },
    greet: ['Good morning', 'Namaste', 'Shubh sandhya'],
    tagline: 'Aaj road kaisi hai?',
    streak: n => `${n} din ki streak`,
    sosMsg: '🆘 Mujhe madad chahiye. Meri location: {url}. Please call karo ya abhi aao.',
    fakeLine: 'Hello? Tum kahan ho? Abhi ghar aa jao, zaroori hai.',
    checklist: [
      'Safe jagah par ruko aur hazard lights on karo.',
      'Koi ghayal ho to 108, police ke liye 112 par call karo.',
      'Gaadiyon, road aur chot ki photo lo.',
      'Behas mat karo. Phone number exchange karo.',
      'Aaj hi platform ko likhit mein batao aur app ka screenshot rakho.',
      'Theek lage tab bhi doctor se check karwao.',
    ],
  },
};
