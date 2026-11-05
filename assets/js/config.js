/* ==========================================================================
   Réglages du site Fairy Nails — à modifier ici (aucun serveur nécessaire)
   Les prix et les prestations se modifient directement dans index.html
   (cartes de la section « La carte des enchantements » : data-name / data-price
   + le texte affiché). La réservation lit ces cartes automatiquement.
   ========================================================================== */
window.FAIRY = {
  name: 'Fairy Nails Onglerie',
  phoneTel: '+33645698622',          // format international, pour sms: et tel:
  phoneDisplay: '06 45 69 86 22',
  email: 'Anaonglerie04@gmail.com',
  address: '12 rue de l’Artisanat, 04000 Digne-les-Bains',
  tz: 'Europe/Paris',

  // Horaires d'ouverture : 0 = dimanche … 6 = samedi, en minutes depuis minuit
  hours: {
    0: [],
    1: [[480, 720], [840, 1200]],
    2: [[480, 720], [840, 1200]],
    3: [[480, 720], [840, 1200]],
    4: [[480, 720], [840, 1200]],
    5: [[480, 720], [840, 1200]],
    6: []
  },

  // Créneaux proposés dans le formulaire de réservation (heure de début souhaitée)
  slots: {
    morning:   ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
    afternoon: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']
  },
  appointmentMinutes: 120,           // durée indicative utilisée pour le fichier agenda (.ics)
  minLeadMinutes: 60,                // on ne propose pas un créneau dans l'heure qui vient
  maxMonthsAhead: 3
};
