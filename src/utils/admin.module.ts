const adminModules = {
  users: {
    label: 'User',
    moduleKey: 'users',
    accessRules: {
      editUser: {
        label: 'Edit User',
      },
      addUser: {
        label: 'Add User',
      },
      deleteUser: {
        label: 'Delete User',
      },
      permissions: {
        label: 'Permissions',
      },
    },
  },
  role: {
    label: 'Role',
    moduleKey: 'role',
    accessRules: {
      viewRoles: {
        label: 'View Roles',
      },
      editRole: {
        label: 'Edit Role',
      },
      addRole: {
        label: 'Add Role',
      },
      deleteRole: {
        label: 'Delete Role',
      },
      assignUser: {
        label: 'Assign Users',
      },
    },
  },
};

export default adminModules;
