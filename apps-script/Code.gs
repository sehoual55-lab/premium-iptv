/**
 * ============================================================================
 *  PREMIUM IPTV — Commandes → Google Sheets + alerte e-mail
 *  Fichier : Code.gs   (Google Apps Script)   —   VERSION 2
 * ============================================================================
 *
 *  NOUVEAUTÉ v2 : le script LIT LA LIGNE 1 de votre feuille et place chaque
 *  donnée dans la bonne colonne, quel que soit leur ordre ou leur nom.
 *  Vous pouvez ajouter, retirer ou déplacer des colonnes librement.
 *
 *  Noms de colonnes reconnus (accents et majuscules sans importance) :
 *    Date · Référence · Nom · Email · Téléphone · Formule · Durée ·
 *    Connexions · Prix · Prix unitaire · Total · Paiement · Statut ·
 *    Source · Navigateur
 *
 *  ---------------------------------------------------------------------------
 *  INSTALLATION
 *  1. Collez ce fichier dans https://script.google.com (remplacez tout)
 *  2. Vérifiez CLE_SECRETE ci-dessous = commandes.cle dans index.html
 *  3. Exécutez la fonction  diagnostic  → elle affiche vos onglets, vos
 *     en-têtes et ce qui sera écrit dans chaque colonne
 *  4. Exécutez  testerEnregistrement  → une vraie ligne + l'e-mail d'alerte
 *  5. Déployer → Gérer les déploiements → ✏️ → Version : NOUVELLE VERSION
 *     (obligatoire après chaque modification, sinon l'ancien code tourne)
 * ============================================================================
 */

/* =============================== CONFIG =============================== */

var CONFIG = {
  ID_FEUILLE: '1Gmx5bQ7y9H4kEEkz070NWuUWPodojgz7FenFiyLJcJk',

  // Onglet cible. Si ce nom n'existe pas, le script utilise le PREMIER onglet
  // (il ne crée plus d'onglet en double).
  NOM_ONGLET: 'Commandes',

  // Doit être IDENTIQUE à commandes.cle dans index.html
  CLE_SECRETE: 'CHANGEZ-MOI-4f7a92',

  EMAIL_ALERTE: 'xyz905391@gmail.com',
  NOM_EXPEDITEUR: 'Premium IPTV',
  WHATSAPP_SERVICE: '16615413954',
  DEVISE: '€',
  FUSEAU: 'Europe/Paris'
};

// En-têtes créés uniquement si la feuille est totalement vide
var COLONNES_DEFAUT = ['Date', 'Référence', 'Nom', 'Email', 'Téléphone', 'Formule',
                       'Durée', 'Connexions', 'Prix (€)', 'Total (€)', 'Paiement', 'Statut'];

/* ============================ POINT D'ENTRÉE ============================ */

function doPost(e) {
  var verrou = LockService.getScriptLock();
  try {
    verrou.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      return reponse(false, 'Corps de requête vide');
    }

    var d = JSON.parse(e.postData.contents);

    if (String(d.cle || '') !== String(CONFIG.CLE_SECRETE)) {
      return reponse(false, 'Clé invalide — vérifiez CLE_SECRETE dans Code.gs et commandes.cle dans index.html');
    }

    var feuille = obtenirFeuille_();
    var ecrit = ecrireLigne_(feuille, d);

    alerter_(d);

    return reponse(true, 'Commande enregistrée', {
      ref: d.ref, onglet: feuille.getName(), ligne: ecrit.ligne, colonnes: ecrit.reconnues
    });

  } catch (err) {
    console.error(err);
    return reponse(false, String(err));
  } finally {
    try { verrou.releaseLock(); } catch (ignore) {}
  }
}

function doGet() {
  return reponse(true, 'Premium IPTV — endpoint actif');
}

/* ==================== ÉCRITURE PILOTÉE PAR LES EN-TÊTES ==================== */

function ecrireLigne_(feuille, d) {
  var nbCol = Math.max(feuille.getLastColumn(), 1);
  var entetes = feuille.getRange(1, 1, 1, nbCol).getValues()[0];

  // Y a-t-il une colonne Total distincte d'une colonne Prix ?
  var aTotal = false, aPrix = false;
  for (var i = 0; i < entetes.length; i++) {
    var c = normaliser_(entetes[i]);
    if (c === 'total' || c === 'montant' || c === 'totalapayer') { aTotal = true; }
    if (c === 'prix' || c === 'price' || c === 'prixunitaire') { aPrix = true; }
  }

  var ligne = [], reconnues = 0;
  for (var j = 0; j < entetes.length; j++) {
    var v = valeurPour_(normaliser_(entetes[j]), d, aTotal && aPrix);
    if (v !== null) { reconnues++; }
    ligne.push(v === null ? '' : v);
  }

  // Aucune colonne reconnue : on n'écrase rien, on ajoute la ligne brute
  if (reconnues === 0) {
    console.warn('Aucun en-tête reconnu dans « ' + feuille.getName() + ' ». Ligne ajoutée au format par défaut.');
    ecrireEnTetes_(feuille);
    return ecrireLigne_(feuille, d);
  }

  feuille.appendRow(ligne);
  var num = feuille.getLastRow();

  // Formats
  for (var k = 0; k < entetes.length; k++) {
    var n = normaliser_(entetes[k]);
    if (n === 'date' || n === 'horodatage' || n === 'timestamp') {
      feuille.getRange(num, k + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }
    if (n === 'prix' || n === 'price' || n === 'prixunitaire' || n === 'total' ||
        n === 'montant' || n === 'totalapayer') {
      feuille.getRange(num, k + 1).setNumberFormat('#,##0.00 "' + CONFIG.DEVISE + '"');
    }
  }

  return { ligne: num, reconnues: reconnues };
}

/** Renvoie la valeur à mettre dans une colonne, ou null si l'en-tête est inconnu. */
function valeurPour_(cle, d, prixEstUnitaire) {
  switch (cle) {
    case 'date': case 'horodatage': case 'timestamp': case 'datedecommande':
      return new Date();

    case 'reference': case 'ref': case 'numerodecommande': case 'commande': case 'id':
      return texte_(d.ref, 40);

    case 'nom': case 'name': case 'client': case 'nomcomplet': case 'nomduclient': case 'fullname':
      return texte_(d.nom, 120);

    case 'email': case 'mail': case 'adresseemail': case 'adresseemail2': case 'courriel':
      return texte_(d.email, 120);

    case 'telephone': case 'phone': case 'whatsapp': case 'numero': case 'mobile': case 'tel':
      return texte_(d.telephone, 40);

    case 'formule': case 'plan': case 'abonnement': case 'offre': case 'pack': case 'package':
      return texte_(d.formule, 60);

    case 'duree': case 'periode': case 'duration': case 'mois':
      return texte_(d.duree, 40);

    case 'connexions': case 'connexion': case 'connections': case 'connection':
    case 'nombredeconnexions': case 'ecrans': case 'devices':
      return Number(d.connexions) || 1;

    case 'prix': case 'price': case 'tarif':
      // S'il existe aussi une colonne Total, « Prix » = prix unitaire.
      // Sinon « Prix » reçoit le montant réellement payé.
      return prixEstUnitaire ? nombre_(d.prixUnitaire) : nombre_(d.total);

    case 'prixunitaire': case 'prixunite': case 'unitprice':
      return nombre_(d.prixUnitaire);

    case 'total': case 'montant': case 'totalapayer': case 'amount':
      return nombre_(d.total);

    case 'paiement': case 'modedepaiement': case 'payment': case 'paymentmethod':
      return texte_(d.paiement, 40);

    case 'statut': case 'status': case 'etat':
      return 'Nouvelle';

    case 'source': case 'page': case 'origine': case 'url':
      return texte_(d.page, 200);

    case 'navigateur': case 'useragent': case 'appareil': case 'browser':
      return texte_(d.navigateur, 200);

    default:
      return null;
  }
}

function normaliser_(v) {
  var s = String(v === null || v === undefined ? '' : v).toLowerCase();
  if (s.normalize) { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  return s.replace(/[^a-z0-9]/g, '');
}

/* ============================ FEUILLE ============================ */

function obtenirFeuille_() {
  var classeur = SpreadsheetApp.openById(CONFIG.ID_FEUILLE);
  var feuille = classeur.getSheetByName(CONFIG.NOM_ONGLET);

  // Onglet introuvable → on prend le premier, on ne crée pas de doublon
  if (!feuille) { feuille = classeur.getSheets()[0]; }

  if (feuille.getLastRow() === 0) { ecrireEnTetes_(feuille); }
  return feuille;
}

function ecrireEnTetes_(feuille) {
  feuille.getRange(1, 1, 1, COLONNES_DEFAUT.length)
         .setValues([COLONNES_DEFAUT])
         .setFontWeight('bold')
         .setBackground('#121212')
         .setFontColor('#ffffff');
  feuille.setFrozenRows(1);
}

/* ============================ ALERTE E-MAIL ============================ */

function alerter_(d) {
  if (!CONFIG.EMAIL_ALERTE) { return; }
  try {
    MailApp.sendEmail({
      to: CONFIG.EMAIL_ALERTE,
      subject: '🛒 Nouvelle commande — Premium IPTV — ' + texte_(d.formule, 60) +
               ' (' + montant_(d.total) + ')',
      name: CONFIG.NOM_EXPEDITEUR,
      replyTo: texte_(d.email, 120) || undefined,
      htmlBody: corpsHtml_(d),
      body: corpsTexte_(d)
    });
  } catch (err) {
    console.error('Alerte e-mail non envoyée : ' + err);
  }
}

function corpsHtml_(d) {
  var waClient  = String(d.telephone || '').replace(/\D/g, '');
  var prenom    = String(d.nom || '').trim().split(' ')[0];
  var quand     = Utilities.formatDate(new Date(), CONFIG.FUSEAU, "dd/MM/yyyy 'à' HH:mm");
  var lienSheet = 'https://docs.google.com/spreadsheets/d/' + CONFIG.ID_FEUILLE + '/edit';

  var messageWa = 'Bonjour ' + prenom + ', merci pour votre commande ' + texte_(d.ref, 40) +
                  ' — ' + texte_(d.formule, 60) + ' (' + texte_(d.duree, 40) + ', ' +
                  (Number(d.connexions) || 1) + ' connexion(s)), total ' + montant_(d.total) +
                  '. Je vous transmets les informations de paiement et vos accès.';
  var lienWa = 'https://wa.me/' + waClient + '?text=' + encodeURIComponent(messageWa);

  var lignes =
      rang_('Formule',    echapper_(d.formule) + ' · ' + echapper_(d.duree)) +
      rang_('Prix',       montant_(d.prixUnitaire) + ' <span style="color:#888;font-weight:400">/ unité</span>') +
      rang_('Connexions', String(Number(d.connexions) || 1)) +
      rang_('Total',      '<span style="color:#c0392b;font-size:17px">' + montant_(d.total) + '</span>') +
      rang_('Nom',        echapper_(d.nom)) +
      rang_('Téléphone',  echapper_(d.telephone)) +
      rang_('E-mail',     '<a href="mailto:' + echapper_(d.email) + '" style="color:#1a73e8">' + echapper_(d.email) + '</a>') +
      rang_('Paiement',   echapper_(d.paiement)) +
      rang_('Référence',  echapper_(d.ref)) +
      rang_('Date',       quand);

  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;' +
         'max-width:620px;margin:0 auto;padding:8px 4px;color:#202124">' +
    '<h2 style="margin:0 0 6px;font-size:22px;color:#3c4bd8;font-weight:700">Nouvelle commande — Premium IPTV</h2>' +
    '<p style="margin:0 0 20px;font-size:14px;color:#5f6368">Reçue via le popup de commande du site.</p>' +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;' +
    'border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;font-size:14px">' + lignes + '</table>' +
    '<table cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px"><tr>' +
      '<td style="background:#25a05a;border-radius:6px"><a href="' + lienWa + '" ' +
      'style="display:inline-block;padding:13px 22px;color:#ffffff;font-weight:700;font-size:14px;' +
      'text-decoration:none">Contacter le client sur WhatsApp</a></td></tr></table>' +
    '<p style="margin:16px 0 0;font-size:13px;color:#5f6368">' +
      '<a href="' + lienSheet + '" style="color:#1a73e8">Ouvrir la feuille des commandes</a> &nbsp;·&nbsp; ' +
      '<a href="https://wa.me/' + CONFIG.WHATSAPP_SERVICE + '" style="color:#1a73e8">WhatsApp du service</a></p>' +
  '</div>';
}

function rang_(libelle, valeur) {
  return '<tr><td style="padding:13px 16px;background:#fafafa;border-bottom:1px solid #e8e8e8;' +
         'color:#5f6368;width:34%;vertical-align:top">' + libelle + '</td>' +
         '<td style="padding:13px 16px;border-bottom:1px solid #e8e8e8;font-weight:600;color:#202124">' +
         valeur + '</td></tr>';
}

function corpsTexte_(d) {
  return 'NOUVELLE COMMANDE — PREMIUM IPTV\n\n' +
    'Formule    : ' + texte_(d.formule, 60) + ' · ' + texte_(d.duree, 40) + '\n' +
    'Prix       : ' + montant_(d.prixUnitaire) + ' / unité\n' +
    'Connexions : ' + (Number(d.connexions) || 1) + '\n' +
    'Total      : ' + montant_(d.total) + '\n' +
    'Nom        : ' + texte_(d.nom, 120) + '\n' +
    'Téléphone  : ' + texte_(d.telephone, 40) + '\n' +
    'E-mail     : ' + texte_(d.email, 120) + '\n' +
    'Paiement   : ' + texte_(d.paiement, 40) + '\n' +
    'Référence  : ' + texte_(d.ref, 40) + '\n\n' +
    'WhatsApp client : https://wa.me/' + String(d.telephone || '').replace(/\D/g, '') + '\n';
}

/* ============================ OUTILS ============================ */

function texte_(v, max) {
  if (v === null || v === undefined) { return ''; }
  var s = String(v).trim();
  return s.length > max ? s.substring(0, max) : s;
}

function nombre_(n) { return Number(n) || 0; }

function echapper_(v) {
  return texte_(v, 200).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function montant_(n) {
  return (Number(n) || 0).toFixed(2).replace('.', ',') + ' ' + CONFIG.DEVISE;
}

function reponse(ok, message, extra) {
  var corps = { ok: ok, message: message };
  if (extra) { for (var k in extra) { corps[k] = extra[k]; } }
  return ContentService.createTextOutput(JSON.stringify(corps))
                       .setMimeType(ContentService.MimeType.JSON);
}

function exemple_() {
  return {
    cle: CONFIG.CLE_SECRETE,
    ref: 'PI-260819-0001',
    formule: 'Gold',
    duree: '15 mois (+3 mois offerts)',
    connexions: 2,
    prixUnitaire: 49.99,
    total: 92.48,
    nom: 'Jean Dupont',
    email: 'jean.dupont@example.fr',
    telephone: '+33 612345678',
    paiement: 'Carte bancaire',
    page: 'https://exemple.fr/',
    navigateur: 'Test depuis Apps Script'
  };
}

/* ==================== FONCTIONS À LANCER À LA MAIN ==================== */

/**
 * ▶ LANCEZ CELLE-CI EN PREMIER.
 * Affiche vos onglets, l'onglet utilisé, vos en-têtes, et ce que le script
 * mettra dans chaque colonne. Rien n'est modifié.
 */
function diagnostic() {
  var classeur = SpreadsheetApp.openById(CONFIG.ID_FEUILLE);
  var noms = classeur.getSheets().map(function (f) { return f.getName(); });
  console.log('Classeur   : ' + classeur.getName());
  console.log('Onglets    : ' + noms.join(' | '));

  var feuille = classeur.getSheetByName(CONFIG.NOM_ONGLET);
  if (!feuille) {
    console.log('⚠ Onglet « ' + CONFIG.NOM_ONGLET + ' » introuvable → utilisation du premier onglet.');
    feuille = classeur.getSheets()[0];
  }
  console.log('Onglet visé : ' + feuille.getName());

  var nbCol = Math.max(feuille.getLastColumn(), 1);
  var entetes = feuille.getRange(1, 1, 1, nbCol).getValues()[0];
  var d = exemple_(), ok = 0;

  console.log('--- Correspondance des colonnes ---');
  for (var i = 0; i < entetes.length; i++) {
    var v = valeurPour_(normaliser_(entetes[i]), d, false);
    var lettre = String.fromCharCode(65 + i);
    if (v === null) {
      console.log(lettre + '  « ' + entetes[i] + ' »  →  ❌ non reconnu, restera vide');
    } else {
      ok++;
      console.log(lettre + '  « ' + entetes[i] + ' »  →  ✅ ' + v);
    }
  }
  console.log('--- ' + ok + ' colonne(s) sur ' + entetes.length + ' seront remplies ---');
  console.log('Clé secrète configurée : ' + CONFIG.CLE_SECRETE);
  console.log('E-mail d\'alerte        : ' + CONFIG.EMAIL_ALERTE);
}

/** Écrit une vraie ligne de test dans la feuille + envoie l'e-mail. */
function testerEnregistrement() {
  var r = doPost({ postData: { contents: JSON.stringify(exemple_()) } });
  console.log(r.getContent());
}

/** Envoie seulement l'e-mail de test. */
function testerEmail() {
  alerter_(exemple_());
  console.log('E-mail de test envoyé à ' + CONFIG.EMAIL_ALERTE);
}
