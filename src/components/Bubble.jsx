import { motion } from 'framer-motion';
import { rise } from '../lib/motion.js';

export function Bubble({ i = 0, children, className = '', style, instant = false }) {
  return (
    <motion.div
      className={`bubble ${className}`}
      variants={rise}
      initial={instant ? false : 'hidden'}
      animate="show"
      custom={i}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function Rise({ i = 0, children, className = '', as = 'div', style, instant = false, ...rest }) {
  const Comp = motion[as];
  return (
    <Comp
      {...rest}
      className={className}
      variants={rise}
      initial={instant ? false : 'hidden'}
      animate="show"
      custom={i}
      style={style}
    >
      {children}
    </Comp>
  );
}
