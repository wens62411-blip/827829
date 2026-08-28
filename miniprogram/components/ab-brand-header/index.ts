Component({
  properties: {
    eyebrow: { type: String, value: 'AB CLUB' },
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    theme: { type: String, value: 'light' },
    compact: { type: Boolean, value: false },
  },

  data: {
    logoFailed: false,
  },

  methods: {
    handleLogoError() {
      this.setData({ logoFailed: true });
    },
  },
});
