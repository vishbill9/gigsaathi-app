// Translates the fixed interface text (labels, buttons, placeholders) into the chosen language.
// Replies from Saathi already arrive in that language from the model; this covers the static UI.
// Order of each entry: [Hindi, Punjabi, Hinglish].
const D = {
  'Talk or type anything…': ['कुछ भी बोलें या लिखें…', 'ਕੁਝ ਵੀ ਬੋਲੋ ਜਾਂ ਲਿਖੋ…', 'Kuch bhi bolo ya likho…'],
  'Talk or type anything to Saathi': ['साथी से कुछ भी बोलें या लिखें', 'ਸਾਥੀ ਨੂੰ ਕੁਝ ਵੀ ਬੋਲੋ ਜਾਂ ਲਿਖੋ', 'Saathi se kuch bhi bolo ya likho'],
  'Go': ['भेजें', 'ਭੇਜੋ', 'Bhejo'],
  'Easy mode': ['आसान मोड', 'ਸੌਖਾ ਮੋਡ', 'Easy mode'],
  'Try: “14 orders, ₹1850, petrol 300” or “my account was blocked”': ['आज़माएँ: “14 ऑर्डर, ₹1850, पेट्रोल 300” या “मेरा अकाउंट ब्लॉक हो गया”', 'ਅਜ਼ਮਾਓ: “14 ਆਰਡਰ, ₹1850, ਪੈਟਰੋਲ 300” ਜਾਂ “ਮੇਰਾ ਅਕਾਊਂਟ ਬਲਾਕ ਹੋ ਗਿਆ”', 'Try karo: “14 orders, ₹1850, petrol 300” ya “mera account block ho gaya”'],
  'How are you feeling today?': ['आज आप कैसा महसूस कर रहे हैं?', 'ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?', 'Aaj aap kaisa feel kar rahe ho?'],
  'A few heavy days? You are not alone, and talking to someone can really help.': ['कुछ दिन भारी रहे? आप अकेले नहीं हैं, किसी से बात करने से सच में मदद मिलती है।', 'ਕੁਝ ਦਿਨ ਭਾਰੀ ਰਹੇ? ਤੁਸੀਂ ਇਕੱਲੇ ਨਹੀਂ ਹੋ, ਕਿਸੇ ਨਾਲ ਗੱਲ ਕਰਨ ਨਾਲ ਸੱਚਮੁੱਚ ਮਦਦ ਮਿਲਦੀ ਹੈ।', 'Kuch din bhaari rahe? Aap akele nahi ho, kisi se baat karne se sach mein madad milti hai.'],
  'Call Tele-MANAS 14416 (free)': ['Tele-MANAS 14416 पर कॉल करें (मुफ़्त)', 'Tele-MANAS 14416 ’ਤੇ ਕਾਲ ਕਰੋ (ਮੁਫ਼ਤ)', 'Tele-MANAS 14416 par call karo (free)'],
  'Something fun': ['कुछ मज़ेदार', 'ਕੁਝ ਮਜ਼ੇਦਾਰ', 'Kuch mazedaar'],
  '🎁 Surprise me': ['🎁 सरप्राइज़ दो', '🎁 ਸਰਪ੍ਰਾਈਜ਼ ਦਿਓ', '🎁 Surprise do'],
  '😂 Make me laugh': ['😂 हँसाओ', '😂 ਹਸਾਓ', '😂 Hansao'],
  '🔥 Hype me up': ['🔥 जोश भरो', '🔥 ਜੋਸ਼ ਭਰੋ', '🔥 Josh bharo'],
  'Chat with Saathi': ['साथी से बात करें', 'ਸਾਥੀ ਨਾਲ ਗੱਲ ਕਰੋ', 'Saathi se baat karo'],
  'Tell Saathi anything': ['साथी को कुछ भी बताएँ', 'ਸਾਥੀ ਨੂੰ ਕੁਝ ਵੀ ਦੱਸੋ', 'Saathi ko kuch bhi batao'],
  'Your money, made simple': ['आपका पैसा, आसान भाषा में', 'ਤੁਹਾਡਾ ਪੈਸਾ, ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ', 'Aapka paisa, aasan bhasha mein'],
  'Last 7 days': ['पिछले 7 दिन', 'ਪਿਛਲੇ 7 ਦਿਨ', 'Pichhle 7 din'],
  'Add today': ['आज की कमाई जोड़ें', 'ਅੱਜ ਦੀ ਕਮਾਈ ਜੋੜੋ', 'Aaj ki kamai jodo'],
  'Add': ['जोड़ें', 'ਜੋੜੋ', 'Jodo'],
  '14 orders, ₹1850, petrol ₹300': ['14 ऑर्डर, ₹1850, पेट्रोल ₹300', '14 ਆਰਡਰ, ₹1850, ਪੈਟਰੋਲ ₹300', '14 orders, ₹1850, petrol ₹300'],
  'Speak or type in any language. Saathi picks out the numbers. Entries are saved privately in a database, tied only to this device. No name, phone or email needed.': ['किसी भी भाषा में बोलें या लिखें। साथी नंबर खुद निकाल लेता है। एंट्री निजी तौर पर डेटाबेस में सेव होती है, सिर्फ़ इस डिवाइस से जुड़ी। नाम, फ़ोन या ईमेल की ज़रूरत नहीं।', 'ਕਿਸੇ ਵੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ ਜਾਂ ਲਿਖੋ। ਸਾਥੀ ਨੰਬਰ ਆਪੇ ਲੱਭ ਲੈਂਦਾ ਹੈ। ਐਂਟਰੀਆਂ ਨਿੱਜੀ ਤੌਰ ’ਤੇ ਡੇਟਾਬੇਸ ਵਿੱਚ ਸੇਵ ਹੁੰਦੀਆਂ ਹਨ, ਸਿਰਫ਼ ਇਸ ਡਿਵਾਈਸ ਨਾਲ ਜੁੜੀਆਂ। ਨਾਮ, ਫ਼ੋਨ ਜਾਂ ਈਮੇਲ ਦੀ ਲੋੜ ਨਹੀਂ।', 'Kisi bhi language mein bolo ya likho. Saathi numbers khud nikaal leta hai. Entries privately database mein save hoti hain, sirf is device se judi. Naam, phone ya email ki zaroorat nahi.'],
  'See all days': ['सभी दिन देखें', 'ਸਾਰੇ ਦਿਨ ਦੇਖੋ', 'Saare din dekho'],
  '⬇ Download my data': ['⬇ मेरा डेटा डाउनलोड करें', '⬇ ਮੇਰਾ ਡੇਟਾ ਡਾਊਨਲੋਡ ਕਰੋ', '⬇ Mera data download karo'],
  '🗑 Delete all my data': ['🗑 मेरा सारा डेटा मिटाएँ', '🗑 ਮੇਰਾ ਸਾਰਾ ਡੇਟਾ ਮਿਟਾਓ', '🗑 Mera saara data delete karo'],
  'Ask your earnings coach': ['अपने कमाई कोच से पूछें', 'ਆਪਣੇ ਕਮਾਈ ਕੋਚ ਤੋਂ ਪੁੱਛੋ', 'Apne earnings coach se pucho'],
  'Ask about your earnings': ['अपनी कमाई के बारे में पूछें', 'ਆਪਣੀ ਕਮਾਈ ਬਾਰੇ ਪੁੱਛੋ', 'Apni kamai ke baare mein pucho'],
  'Explain my week': ['मेरा हफ़्ता समझाएँ', 'ਮੇਰਾ ਹਫ਼ਤਾ ਸਮਝਾਓ', 'Mera hafta samjhao'],
  'Which day was my worst and why?': ['मेरा सबसे खराब दिन कौन सा था और क्यों?', 'ਮੇਰਾ ਸਭ ਤੋਂ ਮਾੜਾ ਦਿਨ ਕਿਹੜਾ ਸੀ ਅਤੇ ਕਿਉਂ?', 'Mera sabse kharab din kaun sa tha aur kyun?'],
  'How can I cut my fuel cost?': ['मैं ईंधन का खर्च कैसे घटाऊँ?', 'ਮੈਂ ਤੇਲ ਦਾ ਖ਼ਰਚਾ ਕਿਵੇਂ ਘਟਾਵਾਂ?', 'Main fuel ka kharcha kaise kam karun?'],
  'Ride safe, ride calm': ['सुरक्षित चलें, शांत रहें', 'ਸੁਰੱਖਿਅਤ ਚਲੋ, ਸ਼ਾਂਤ ਰਹੋ', 'Safe chalo, calm raho'],
  'Tips for night deliveries': ['रात की डिलीवरी के टिप्स', 'ਰਾਤ ਦੀ ਡਿਲੀਵਰੀ ਲਈ ਸੁਝਾਅ', 'Raat ki delivery ke tips'],
  'I had a small accident, what now?': ['छोटा एक्सीडेंट हो गया, अब क्या करूँ?', 'ਛੋਟਾ ਐਕਸੀਡੈਂਟ ਹੋ ਗਿਆ, ਹੁਣ ਕੀ ਕਰਾਂ?', 'Chhota accident ho gaya, ab kya karun?'],
  'Heavy rain and I still have orders': ['तेज़ बारिश है और ऑर्डर बाकी हैं', 'ਤੇਜ਼ ਮੀਂਹ ਹੈ ਅਤੇ ਆਰਡਰ ਬਾਕੀ ਹਨ', 'Tez baarish hai aur orders baaki hain'],
  'Ask a safety question': ['सुरक्षा का सवाल पूछें', 'ਸੁਰੱਖਿਆ ਦਾ ਸਵਾਲ ਪੁੱਛੋ', 'Safety ka sawaal pucho'],
  '🎯 Which schemes fit me?': ['🎯 मेरे लिए कौन सी योजनाएँ हैं?', '🎯 ਮੇਰੇ ਲਈ ਕਿਹੜੀਆਂ ਯੋਜਨਾਵਾਂ ਹਨ?', '🎯 Mere liye kaun si schemes hain?'],
  'My age': ['मेरी उम्र', 'ਮੇਰੀ ਉਮਰ', 'Meri age'],
  'My monthly income': ['मेरी मासिक आय', 'ਮੇਰੀ ਮਹੀਨਾਵਾਰ ਆਮਦਨ', 'Meri monthly income'],
  'Up to ₹15,000': ['₹15,000 तक', '₹15,000 ਤੱਕ', '₹15,000 tak'],
  'More than ₹15,000': ['₹15,000 से ज़्यादा', '₹15,000 ਤੋਂ ਵੱਧ', '₹15,000 se zyada'],
  'I already have an e-Shram card': ['मेरे पास e-Shram कार्ड है', 'ਮੇਰੇ ਕੋਲ e-Shram ਕਾਰਡ ਹੈ', 'Mere paas e-Shram card hai'],
  'I have a bank account': ['मेरा बैंक खाता है', 'ਮੇਰਾ ਬੈਂਕ ਖਾਤਾ ਹੈ', 'Mera bank account hai'],
  'Check my schemes': ['मेरी योजनाएँ देखें', 'ਮੇਰੀਆਂ ਯੋਜਨਾਵਾਂ ਦੇਖੋ', 'Meri schemes dekho'],
  'Ask about your rights': ['अपने अधिकारों के बारे में पूछें', 'ਆਪਣੇ ਹੱਕਾਂ ਬਾਰੇ ਪੁੱਛੋ', 'Apne adhikaar ke baare mein pucho'],
  'Ask about schemes and rights': ['योजनाओं और अधिकारों के बारे में पूछें', 'ਯੋਜਨਾਵਾਂ ਅਤੇ ਹੱਕਾਂ ਬਾਰੇ ਪੁੱਛੋ', 'Schemes aur adhikaar ke baare mein pucho'],
  'What is e-Shram and how do I register?': ['e-Shram क्या है और रजिस्टर कैसे करूँ?', 'e-Shram ਕੀ ਹੈ ਅਤੇ ਰਜਿਸਟਰ ਕਿਵੇਂ ਕਰਾਂ?', 'e-Shram kya hai aur register kaise karun?'],
  'Am I eligible for the PM-SYM pension?': ['क्या मैं PM-SYM पेंशन के लिए पात्र हूँ?', 'ਕੀ ਮੈਂ PM-SYM ਪੈਨਸ਼ਨ ਲਈ ਯੋਗ ਹਾਂ?', 'Kya main PM-SYM pension ke liye eligible hoon?'],
  'Health insurance for gig workers': ['गिग वर्कर्स के लिए स्वास्थ्य बीमा', 'ਗਿਗ ਵਰਕਰਾਂ ਲਈ ਸਿਹਤ ਬੀਮਾ', 'Gig workers ke liye health insurance'],
  'Got a confusing message?': ['कोई उलझाने वाला मैसेज मिला?', 'ਕੋਈ ਉਲਝਾਉਣ ਵਾਲਾ ਸੁਨੇਹਾ ਮਿਲਿਆ?', 'Koi confusing message mila?'],
  'Paste a notice, email or payout statement. Saathi explains it in simple words.': ['नोटिस, ईमेल या पेआउट स्टेटमेंट यहाँ चिपकाएँ। साथी आसान शब्दों में समझाएगा।', 'ਨੋਟਿਸ, ਈਮੇਲ ਜਾਂ ਪੇਆਊਟ ਸਟੇਟਮੈਂਟ ਇੱਥੇ ਪੇਸਟ ਕਰੋ। ਸਾਥੀ ਸੌਖੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਮਝਾਏਗਾ।', 'Notice, email ya payout statement yahan paste karo. Saathi aasan shabdon mein samjhayega.'],
  'Text of the document': ['दस्तावेज़ का पाठ', 'ਦਸਤਾਵੇਜ਼ ਦਾ ਪਾਠ', 'Document ka text'],
  'Paste the text here…': ['पाठ यहाँ चिपकाएँ…', 'ਪਾਠ ਇੱਥੇ ਪੇਸਟ ਕਰੋ…', 'Text yahan paste karo…'],
  'Explain simply': ['आसान भाषा में समझाएँ', 'ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝਾਓ', 'Aasan bhasha mein samjhao'],
  '📎 Load a .txt file': ['📎 .txt फ़ाइल लोड करें', '📎 .txt ਫ਼ਾਈਲ ਲੋਡ ਕਰੋ', '📎 .txt file load karo'],
  'Ask a follow-up': ['अगला सवाल पूछें', 'ਅਗਲਾ ਸਵਾਲ ਪੁੱਛੋ', 'Agla sawaal pucho'],
  'Ask a follow-up about the document': ['दस्तावेज़ के बारे में अगला सवाल पूछें', 'ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਅਗਲਾ ਸਵਾਲ ਪੁੱਛੋ', 'Document ke baare mein agla sawaal pucho'],
  'Your summary is saved privately and reused if you write a complaint.': ['आपका सारांश निजी तौर पर सेव है और शिकायत लिखते समय काम आएगा।', 'ਤੁਹਾਡਾ ਸਾਰ ਨਿੱਜੀ ਤੌਰ ’ਤੇ ਸੇਵ ਹੈ ਅਤੇ ਸ਼ਿਕਾਇਤ ਲਿਖਣ ਵੇਲੇ ਕੰਮ ਆਵੇਗਾ।', 'Aapka summary privately save hai aur complaint likhte time kaam aayega.'],
  'Let us write it together': ['आइए मिलकर लिखें', 'ਆਓ ਮਿਲ ਕੇ ਲਿਖੀਏ', 'Chalo milkar likhte hain'],
  'What is the problem?': ['समस्या क्या है?', 'ਸਮੱਸਿਆ ਕੀ ਹੈ?', 'Problem kya hai?'],
  'Account deactivated or blocked': ['अकाउंट बंद या ब्लॉक किया गया', 'ਅਕਾਊਂਟ ਬੰਦ ਜਾਂ ਬਲਾਕ ਕੀਤਾ ਗਿਆ', 'Account deactivate ya block kiya gaya'],
  'Payout short or missing': ['पेआउट कम या गायब', 'ਪੇਆਊਟ ਘੱਟ ਜਾਂ ਗਾਇਬ', 'Payout kam ya missing'],
  'Wrong deduction or penalty': ['गलत कटौती या जुर्माना', 'ਗ਼ਲਤ ਕਟੌਤੀ ਜਾਂ ਜੁਰਮਾਨਾ', 'Galat deduction ya penalty'],
  'Incentive not paid': ['इंसेंटिव नहीं मिला', 'ਇੰਸੈਂਟਿਵ ਨਹੀਂ ਮਿਲਿਆ', 'Incentive nahi mila'],
  'Unsafe working condition': ['असुरक्षित काम की स्थिति', 'ਅਸੁਰੱਖਿਅਤ ਕੰਮ ਦੇ ਹਾਲਾਤ', 'Unsafe working condition'],
  'Other': ['अन्य', 'ਹੋਰ', 'Other'],
  'What happened?': ['क्या हुआ?', 'ਕੀ ਹੋਇਆ?', 'Kya hua?'],
  'Date, platform, amount if you know…': ['तारीख, प्लेटफ़ॉर्म, रकम (अगर पता हो)…', 'ਤਾਰੀਖ਼, ਪਲੇਟਫ਼ਾਰਮ, ਰਕਮ (ਜੇ ਪਤਾ ਹੋਵੇ)…', 'Date, platform, amount agar pata ho…'],
  'Draft my complaint': ['मेरी शिकायत लिखें', 'ਮੇਰੀ ਸ਼ਿਕਾਇਤ ਲਿਖੋ', 'Meri complaint likho'],
  'Add my earnings facts': ['मेरी कमाई के तथ्य जोड़ें', 'ਮੇਰੀ ਕਮਾਈ ਦੇ ਤੱਥ ਜੋੜੋ', 'Meri kamai ke facts jodo'],
  'Missing details show as [fill in]. Nothing is sent without you.': ['छूटी जानकारी [fill in] दिखती है। आपके बिना कुछ भी नहीं भेजा जाता।', 'ਖੁੰਝੀ ਜਾਣਕਾਰੀ [fill in] ਦਿਸਦੀ ਹੈ। ਤੁਹਾਡੇ ਬਿਨਾਂ ਕੁਝ ਨਹੀਂ ਭੇਜਿਆ ਜਾਂਦਾ।', 'Chhooti jaankari [fill in] dikhti hai. Aapke bina kuch nahi bheja jaata.'],
  'Answer questions or add details': ['सवालों के जवाब दें या जानकारी जोड़ें', 'ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦਿਓ ਜਾਂ ਜਾਣਕਾਰੀ ਜੋੜੋ', 'Sawaalon ke jawab do ya details jodo'],
  'Copy last reply': ['आख़िरी जवाब कॉपी करें', 'ਆਖ਼ਰੀ ਜਵਾਬ ਕਾਪੀ ਕਰੋ', 'Aakhri reply copy karo'],
  'Share on WhatsApp': ['WhatsApp पर भेजें', 'WhatsApp ’ਤੇ ਭੇਜੋ', 'WhatsApp par bhejo'],
  'You are not alone': ['आप अकेले नहीं हैं', 'ਤੁਸੀਂ ਇਕੱਲੇ ਨਹੀਂ ਹੋ', 'Aap akele nahi ho'],
  'Tap a number to call. Help is one touch away.': ['कॉल करने के लिए नंबर दबाएँ। मदद बस एक टच दूर है।', 'ਕਾਲ ਕਰਨ ਲਈ ਨੰਬਰ ਦਬਾਓ। ਮਦਦ ਬੱਸ ਇੱਕ ਟੱਚ ਦੂਰ ਹੈ।', 'Call karne ke liye number dabao. Madad bas ek touch door hai.'],
  'Police and emergency': ['पुलिस और आपातकाल', 'ਪੁਲਿਸ ਅਤੇ ਐਮਰਜੈਂਸੀ', 'Police aur emergency'],
  'Ambulance': ['एम्बुलेंस', 'ਐਂਬੂਲੈਂਸ', 'Ambulance'],
  'Women helpline': ['महिला हेल्पलाइन', 'ਮਹਿਲਾ ਹੈਲਪਲਾਈਨ', 'Mahila helpline'],
  'Tele-MANAS, mental health': ['Tele-MANAS, मानसिक स्वास्थ्य', 'Tele-MANAS, ਮਾਨਸਿਕ ਸਿਹਤ', 'Tele-MANAS, mental health'],
  'After an accident': ['एक्सीडेंट के बाद', 'ਐਕਸੀਡੈਂਟ ਤੋਂ ਬਾਅਦ', 'Accident ke baad'],
  'Let someone know where you are': ['किसी को बताएँ कि आप कहाँ हैं', 'ਕਿਸੇ ਨੂੰ ਦੱਸੋ ਕਿ ਤੁਸੀਂ ਕਿੱਥੇ ਹੋ', 'Kisi ko batao ki aap kahan ho'],
  '📍 Send my live location on WhatsApp': ['📍 WhatsApp पर मेरी लाइव लोकेशन भेजें', '📍 WhatsApp ’ਤੇ ਮੇਰੀ ਲਾਈਵ ਲੋਕੇਸ਼ਨ ਭੇਜੋ', '📍 WhatsApp par meri live location bhejo'],
  '📞 Fake call, to leave an uncomfortable situation': ['📞 नकली कॉल, असहज स्थिति से निकलने के लिए', '📞 ਨਕਲੀ ਕਾਲ, ਅਸਹਿਜ ਹਾਲਾਤ ਵਿੱਚੋਂ ਨਿਕਲਣ ਲਈ', '📞 Fake call, uncomfortable situation se nikalne ke liye'],
  'Decline': ['काटें', 'ਕੱਟੋ', 'Kaato'],
  'Accept': ['उठाएँ', 'ਚੁੱਕੋ', 'Uthao'],
  'End call': ['कॉल खत्म करें', 'ਕਾਲ ਖ਼ਤਮ ਕਰੋ', 'Call khatam karo'],
  'Incoming call…': ['कॉल आ रही है…', 'ਕਾਲ ਆ ਰਹੀ ਹੈ…', 'Call aa rahi hai…'],
  'Home': ['घर', 'ਘਰ', 'Ghar'],
  'Language': ['भाषा', 'ਭਾਸ਼ਾ', 'Language'],
  'Skip to content': ['सीधे सामग्री पर जाएँ', 'ਸਿੱਧੇ ਸਮੱਗਰੀ ’ਤੇ ਜਾਓ', 'Seedhe content par jao'],
  'Speak to Saathi': ['साथी से बोलें', 'ਸਾਥੀ ਨਾਲ ਬੋਲੋ', 'Saathi se bolo'],
  'Speak your entry': ['अपनी एंट्री बोलें', 'ਆਪਣੀ ਐਂਟਰੀ ਬੋਲੋ', 'Apni entry bolo'],
  'Speak your message': ['अपना संदेश बोलें', 'ਆਪਣਾ ਸੁਨੇਹਾ ਬੋਲੋ', 'Apna message bolo'],
  'Pick your mood': ['अपना मूड चुनें', 'ਆਪਣਾ ਮੂਡ ਚੁਣੋ', 'Apna mood chuno'],
  'Bigger text and replies read aloud': ['बड़ा टेक्स्ट और जवाब सुनाए जाएँगे', 'ਵੱਡਾ ਟੈਕਸਟ ਅਤੇ ਜਵਾਬ ਬੋਲ ਕੇ ਸੁਣਾਏ ਜਾਣਗੇ', 'Bada text aur replies bolkar sunaye jayenge'],
  'Sign in with Google': ['Google से साइन इन करें', 'Google ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ', 'Google se sign in karo'],
  'Sign in': ['साइन इन', 'ਸਾਈਨ ਇਨ', 'Sign in'],
  'with Google': ['Google से', 'Google ਨਾਲ', 'Google se'],
  'Log out': ['लॉग आउट', 'ਲੌਗ ਆਊਟ', 'Log out'],
};
const IDX = { hi: 0, pa: 1, hing: 2 };
const orig = new WeakMap(); // node or element/attr key -> original English
const ATTRS = ['placeholder', 'aria-label', 'title'];
let lang = 'en';

const norm = s => s.replace(/\s+/g, ' ').trim();
const pick = key => (lang === 'en' ? null : D[key]?.[IDX[lang]] ?? null);

function text(node) {
  const src = orig.get(node) ?? node.nodeValue;
  const key = norm(src);
  if (!D[key]) return;
  if (!orig.has(node)) orig.set(node, src);
  const out = lang === 'en' ? key : pick(key) ?? key;
  node.nodeValue = src.match(/^\s*/)[0] + out + src.match(/\s*$/)[0];
}

function attrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (v == null) continue;
    const store = orig.get(el) ?? {};
    const src = store[a] ?? v;
    if (!D[norm(src)]) continue;
    store[a] = src; orig.set(el, store);
    el.setAttribute(a, lang === 'en' ? src : pick(norm(src)) ?? src);
  }
}

function scan(root) {
  if (root.nodeType === 3) return text(root);
  if (root.nodeType !== 1) return;
  attrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) (n.nodeType === 3 ? text(n) : attrs(n));
}

const observer = new MutationObserver(list => {
  observer.disconnect();
  for (const m of list) for (const n of m.addedNodes) scan(n);
  observer.observe(document.body, { childList: true, subtree: true });
});

export function applyTranslations(next) {
  lang = next;
  observer.disconnect();
  scan(document.body);
  observer.observe(document.body, { childList: true, subtree: true });
}
