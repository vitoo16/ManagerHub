import { ROLE_PROFILES } from '@managerhub/domain';

export const getRoleTitle = (id: string): string => ROLE_PROFILES.find(role => role.id === id)?.title ?? id;
