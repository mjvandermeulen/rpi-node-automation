interface GroupSetting {
  displayName: string
  defaultTimer: number
  enabled: boolean
}

// LEARN ***
export interface GroupsSettings {
  [key: string]: GroupSetting
}

export const groupsSettings: GroupsSettings = {
  livingroom: {
    displayName: 'Living Room',
    defaultTimer: 0,
    enabled: false,
  },
  officelight: {
    displayName: 'Office Light',
    defaultTimer: 0,
    enabled: true,
  },
  coffee: {
    displayName: 'Coffee',
    defaultTimer: 45 * 60 * 1000,
    enabled: true,
  },
  fan: {
    displayName: 'Office Fan',
    defaultTimer: 0,
    enabled: false,
  },
  guestlight: {
    displayName: 'Guest Light',
    defaultTimer: 0,
    enabled: true,
  },
  redlight: {
    displayName: 'Guest Night Light',
    defaultTimer: 0,
    enabled: true,
  },
}
