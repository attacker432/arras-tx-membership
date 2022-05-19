module.exports = {
    MinPermissionValue: 0,
    MaxPermissionValue: 100,
    
    MinRoleValue: 10,
    MaxRoleValue: 1000,
    // 0, 10, 20, 30, ..., 150, 160, 170, etc.
    RoleValueInterval: 10,

    MinRoleNameLength: 3,
    MaxRoleNameLength: 30,    
    RoleNameRegEx: /^[a-zA-Z\(\)](\s?[a-zA-Z\(\)])+$/,

    DefaultRoleColor: '#ff0000',
    DefaultRoleName: 'Member',
    DeveloperRole: "Developer",
    DeveloperRoleValue: 1010,

    DefaultMemberStatus: "Active",
    ValidMemberStatuses: [
        "Active",
        "Inactive",
        "Suspended"
    ],

    ApprovedStatus: "Approved",
    ActiveStatus: "Active",
    InactiveStatus: "Inactive",
    SuspendedStatus: "Suspended",

    MinMapNameLength: 2,
    MaxMapNameLength: 30,
    MinMapCells: 10,
    MaxMapCells: 200,
    MapXGrids: 40,
    MapYGrids: 40,
    MapNameRegEx: /^[a-zA-Z0-9](\s?[a-zA-Z0-9])+$/,
    
    DefaultMazeStatus: "Pending Approval",
    ValidMazeStatuses: [
        "Pending Approval",    
        "Approved",
        "Rejected"
    ],

    MinTankNameLength: 2,
    MaxTankNameLength: 30,
    TankNameRegEx: /^[a-zA-Z0-9](\s?[a-zA-Z0-9])+$/,
    DefaultTankStatus: "Pending Approval",
    ValidTankStatuses: [
        "Pending Approval",    
        "Approved",
        "Suspended"
    ],    

    DefaultSettings: {
        allowMemberRegistration : true,
        allowMapSubmission : false,
        allowTankSubmission : false,
        minRoleToViewMemberPasswordHash: 'Developer',
        minRoleToViewMemberCountry: 'Moderator',
        minRoleToEditMemberUsername: 'Owner', 
        minRoleToEditMemberPasswordHash: 'Developer',
        minRoleToEditMemberRole: 'Admin', 
        minRoleToEditMemberStatus: 'Admin',      
        minRoleToDeleteMember: 'Owner',
        minRoleToManageRole: 'Admin', 
        minRoleToDeleteRole: 'Owner', 
        minRoleToEditSettings: 'Developer',
    },

    Settings: {},

    // =============================================
    // User tokens are kept here when they:
    //   - change their passwords
    //   - log out
    //   - are suspended
    // =============================================
    BlacklistedTokens: [],
    
    AllRoles: [],
    AllUsers: [],
    AllTanks: [],
    AllMaps: [],
 //   AllSettings: [],
    AllAudits: [],
  
    // Returns a role object given a role name.
    // Key = Role Name, Value = Role
    RoleFromNameLookup: {},   
};