import { FC, SVGProps } from 'react';

import { IconTypes } from './models-icon';

type IconProps = {
  id: IconTypes;
} & SVGProps<SVGSVGElement>;

const Icon: FC<IconProps> = ({ id, width = 32, height = 32, ...props }) => (
  <svg {...props} width={width} height={height} aria-hidden="true" focusable="false">
    <use href={`/icons.svg#${id}`} />
  </svg>
);

export default Icon;
