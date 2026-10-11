// Param lists for the typed React Navigation tree. Imported by every
// screen so route params are checked at compile time.

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  RequestDetail: { id: string };
  Invite: { token: string };
  SecuritySettings: undefined;
  DebugDeepLink: undefined;
  Lock: { reason?: string } | undefined;
  AdminPanel: undefined;
  LocationPicker: { initialDistrictId?: string } | undefined;
  Respond: { requestId: string };
};

export type MainTabsParamList = {
  Requests: { filter?: string } | undefined;
  Create: undefined;
  Notifications: undefined;
  Profile: undefined;
};
