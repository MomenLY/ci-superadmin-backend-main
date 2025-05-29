export const englishToItalianConversion = (word: string, companyName: string) => {
    switch (word) {
        case 'welcomeTenantMessage':
            return `Benvenuto a ${companyName} – Il Suo account è pronto!`;
        case 'forgotPasswordEmailSubject':
            return 'Reimposta la tua password – Azione richiesta';
        case 'passwordResetSuccessful':
            return 'Reimpostazione della password riuscita – Tutto pronto!';
        case 'accountCreation':
            return 'Creazione account';
        default:
            return 'Translation not found';
    }
};
