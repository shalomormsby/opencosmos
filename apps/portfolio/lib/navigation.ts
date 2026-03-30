import type { HeaderNavLink } from '@opencosmos/ui';

export const ecosystemNavigation: HeaderNavLink[] = [
  {
    label: 'Work',
    children: [
      { label: 'Portfolio (Case Studies)', href: '/case-studies' },
      { label: 'Resume', href: '/resume.pdf' },
    ],
  },
  {
    label: 'Play',
    children: [
      { label: 'Creative Sandbox', href: 'https://ecosystem-creative-powerup.vercel.app/' },
      { label: 'Love Is the Way', href: 'https://shalomormsby.substack.com/' },
      { label: 'Poetry', href: '/poetry' },
      { label: 'Art in Space', href: '/art-in-space' },
    ],
  },
  {
    label: 'Tools',
    children: [
      { label: 'Sage Studio', href: 'https://thesage.dev' },
      { label: 'Cosmograph', href: '/cosmograph' },
      { label: 'Sage Stocks', href: '/sage-stocks' },
      { label: 'SageOS', href: '/sageos' },
    ],
  },
];

/**
 * Helper function to set active states based on current path
 */
export function getNavigationWithActiveStates(currentPath: string): HeaderNavLink[] {
  return ecosystemNavigation.map(link => ({
    ...link,
    active: link.href === currentPath,
    children: link.children?.map(child => ({
      ...child,
      active: child.href === currentPath,
    })),
  }));
}
