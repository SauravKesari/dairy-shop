import { defineStrings } from '../define';

export default defineStrings(
  {
    'settings.title': 'Shop Settings & System Backup',
    'settings.subtitle':
      'Configure parlour receipts, UPI payment IDs, cashier discount caps, and automated off-server backups',
    'settings.saved': 'Shop settings updated successfully!',
    'settings.saveFailed': 'Failed to save settings',
    'settings.identity.title': 'Shop Identity & Receipt Printing',
    'settings.identity.subtitle': 'Appears at top and footer of thermal and A4 bills',
    'settings.shopName': 'Shop Name *',
    'settings.phone': 'Contact Phone *',
    'settings.address': 'Shop Address / Landmark *',
    'settings.upi': 'Shop UPI VPA Address *',
    'settings.upiPlaceholder': 'e.g. gokuldairy@okaxis',
    'settings.upiHint': 'Used to generate dynamic QR codes on customer receipts',
    'settings.invoicePrefix': 'Invoice Prefix *',
    'settings.invoicePrefixResult': 'Result: {example}',
    'settings.receiptFooter': 'Receipt Footer Message',
    'settings.controls.title': 'Operational Controls & Permissions',
    'settings.maxDiscount': 'Cashier Max Allowed Discount (%) *',
    'settings.maxDiscountHint': 'Discounts exceeding this percentage require Owner authorization',
    'settings.gstMode': 'GST Billing Mode',
    'settings.gstEnable': 'Enable GST on bills',
    'settings.negativeStock': 'Allow negative stock sales (Rule 4: disabled by default)',
    'settings.negativeStockHint': 'When unchecked, bills are strictly rejected if inventory on hand is insufficient.',
    'settings.saveConfig': 'Save Configuration',

    'settings.backup.title': 'Full Database Backup & Disaster Recovery (Week 5 Plan)',
    'settings.backup.subtitle': 'Download complete database snapshots (all 15 tables) and test restore procedures',
    'settings.backup.downloadTitle': '1. Download Backup (JSON)',
    'settings.backup.downloadDesc':
      'Creates an offline copy of products, customer ledgers, purchases and expenses, plus the last {days} days of bills, stock movements and audit logs.',
    'settings.backup.export': 'Export Full Database',
    'settings.backup.restoreTitle': '2. Restore Database',
    'settings.backup.restoreDesc':
      "Test disaster restore into a fresh Firebase project. Writes the backup's records to Firestore (staff logins must be re-added).",
    'settings.backup.upload': 'Upload Backup JSON',
    'settings.backup.restoring': 'Restoring backup to Firebase…',
    'settings.backup.restored': 'Backup restored to Firebase. All devices update automatically.',
    'settings.backup.restoreFailed': 'Failed to restore JSON backup.',

    'settings.demo.title': '3. Load Demo Data',
    'settings.demo.desc':
      'Fills an empty shop with sample dairy stock, customers and bills for testing. Only available before any product exists.',
    'settings.demo.button': 'Load Demo Data',
    'settings.demo.hasData': 'Shop already has data',
    'settings.demo.confirm':
      'Load sample dairy products, customers and bills into this shop? Use this only on a test Firebase project.',
    'settings.demo.loaded': 'Demo data loaded.',
    'settings.demo.failed': 'Failed to load demo data.',
  },
  {
    'settings.title': 'दुकान की सेटिंग और बैकअप',
    'settings.subtitle': 'बिल, UPI ID, कैशियर की छूट सीमा और बैकअप की सेटिंग',
    'settings.saved': 'दुकान की सेटिंग सेव हो गई!',
    'settings.saveFailed': 'सेटिंग सेव नहीं हुई',
    'settings.identity.title': 'दुकान की जानकारी और बिल प्रिंट',
    'settings.identity.subtitle': 'थर्मल और A4 बिल के ऊपर और नीचे छपती है',
    'settings.shopName': 'दुकान का नाम *',
    'settings.phone': 'फ़ोन नंबर *',
    'settings.address': 'दुकान का पता / पहचान *',
    'settings.upi': 'दुकान की UPI ID *',
    'settings.upiPlaceholder': 'जैसे: gokuldairy@okaxis',
    'settings.upiHint': 'ग्राहक के बिल पर UPI QR कोड इसी से बनता है',
    'settings.invoicePrefix': 'बिल नंबर की शुरुआत *',
    'settings.invoicePrefixResult': 'नतीजा: {example}',
    'settings.receiptFooter': 'बिल के नीचे का संदेश',
    'settings.controls.title': 'दुकान के नियम और अनुमतियां',
    'settings.maxDiscount': 'कैशियर की अधिकतम छूट (%) *',
    'settings.maxDiscountHint': 'इससे ज़्यादा छूट के लिए मालिक की मंज़ूरी चाहिए',
    'settings.gstMode': 'GST बिलिंग',
    'settings.gstEnable': 'बिल पर GST लगाएं',
    'settings.negativeStock': 'स्टॉक माइनस में जाने पर भी बिक्री होने दें (नियम 4: आम तौर पर बंद)',
    'settings.negativeStockHint': 'टिक न होने पर, स्टॉक कम हो तो बिल नहीं बनेगा।',
    'settings.saveConfig': 'सेटिंग सेव करें',

    'settings.backup.title': 'पूरा डेटा बैकअप और रिकवरी',
    'settings.backup.subtitle': 'पूरे डेटा (सभी 15 टेबल) की कॉपी डाउनलोड करें और रिस्टोर जांचें',
    'settings.backup.downloadTitle': '1. बैकअप डाउनलोड करें (JSON)',
    'settings.backup.downloadDesc':
      'उत्पाद, ग्राहक खाते, खरीद और खर्च की ऑफलाइन कॉपी, साथ में पिछले {days} दिन के बिल, स्टॉक बदलाव और ऑडिट लॉग।',
    'settings.backup.export': 'पूरा डेटा डाउनलोड करें',
    'settings.backup.restoreTitle': '2. डेटा रिस्टोर करें',
    'settings.backup.restoreDesc':
      'नए Firebase प्रोजेक्ट में रिस्टोर जांचें। बैकअप का डेटा Firestore में लिखा जाएगा (स्टाफ लॉगिन फिर से जोड़ने होंगे)।',
    'settings.backup.upload': 'बैकअप JSON अपलोड करें',
    'settings.backup.restoring': 'बैकअप Firebase में रिस्टोर हो रहा है…',
    'settings.backup.restored': 'बैकअप रिस्टोर हो गया। सभी डिवाइस अपने आप अपडेट होंगे।',
    'settings.backup.restoreFailed': 'JSON बैकअप रिस्टोर नहीं हुआ।',

    'settings.demo.title': '3. डेमो डेटा भरें',
    'settings.demo.desc':
      'खाली दुकान में जांच के लिए नमूना स्टॉक, ग्राहक और बिल भरता है। सिर्फ तब, जब कोई उत्पाद न हो।',
    'settings.demo.button': 'डेमो डेटा भरें',
    'settings.demo.hasData': 'दुकान में पहले से डेटा है',
    'settings.demo.confirm':
      'इस दुकान में नमूना उत्पाद, ग्राहक और बिल भरें? इसे सिर्फ टेस्ट Firebase प्रोजेक्ट पर इस्तेमाल करें।',
    'settings.demo.loaded': 'डेमो डेटा भर गया।',
    'settings.demo.failed': 'डेमो डेटा नहीं भरा।',
  }
);
