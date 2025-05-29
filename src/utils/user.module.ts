const userModules = {
    profile: {
        label: "User",
        moduleKey: "profile",
        accessRules: {
            viewProfile: {
                label: "View Profile",
                defaultPermission: true
            },
            editUser: {
                label: "Edit Profile",
            }
        }
    },
    halls: {
        label: 'Halls',
        moduleKey: 'halls',
        accessRules: {
            viewHalls: {
                label: 'View Halls',
            },
            editHall: {
                label: 'Edit Hall',
            },
            addHall: {
                label: 'Add Hall',
            },
            deleteHall: {
                label: 'Delete Hall',
            },
        },
    },
    expo: {
        label: 'Expo',
        moduleKey: 'expo',
        accessRules: {
            viewExpos: {
                label: 'View Expo',
            },
            editExpo: {
                label: 'Edit Expo',
            },
            addExpo: {
                label: 'Add Expo',
            },
            deleteExpo: {
                label: 'Delete Expo',
            },
            qrScanner:{
                label: 'Scan QR Code',
            },
        },
    },
    participants: {
        label: 'Participants',
        moduleKey: 'participants',
        accessRules: {
            viewParticipants: {
                label: 'View Participants',
            },
            editParticipant: {
                label: 'Edit Participant',
            },
            addParticipant: {
                label: 'Add Participant',
            },
            deleteParticipant: {
                label: 'Delete Participants',
            },
        },
    },
    
};

export default userModules;
