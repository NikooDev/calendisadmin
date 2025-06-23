import {animate, style, transition, trigger, query, stagger} from '@angular/animations';

export const element = trigger('element', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(30px)' }),
    animate('0.3s ease-in-out', style({ opacity: 1, transform: 'translateY(0px)' }))
  ])
]);

export function createElementAnimation(triggerName: string, delay: string, direction: 'Y' | 'X' = 'Y') {
  return trigger(triggerName, [
    transition(':enter', [
      style({ opacity: 0, transform: direction === 'X' ? 'translateX(30px)' : 'translateY(30px)' }),
      animate(`0.3s ${delay} ease-in-out`, style({ opacity: 1, transform: direction === 'X' ? 'translateX(0)' : 'translateY(0)' }))
    ])
  ]);
}

export const slideInDown = trigger('slideInDown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(100%)' }),
    animate(
      '.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
  transition(':leave', [
    animate(
      '.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      style({ opacity: 0, transform: 'translateY(100%)' })
    )
  ])
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0)' }),
    animate('0.2s cubic-bezier(0.68, -0.55, 0.27, 1.55)', style({ opacity: 1, transform: 'scale(1)' }))
  ])
]);

export const listUsersSearch = trigger('listUsersSearch', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0 }),
      stagger(100, [
        animate(
          '.5s ease-in-out',
          style({ opacity: 1 })
        )
      ])
    ], { optional: true })
  ])
]);

export const slideInSector = trigger('slideInSector', [
  transition('void => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(100%)' }),
      stagger(100, [
        animate(
          '0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ], { optional: true }),
    query(':leave', [
      animate(
        '0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        style({ opacity: 0, transform: 'translateX(-50px)' })
      )
    ], { optional: true })
  ])
]);

export const element300 = createElementAnimation('element300', '0.3s');
export const element600X = createElementAnimation('element600X', '0.6s', 'X');
export const element900X = createElementAnimation('element900X', '0.9s', 'X');
