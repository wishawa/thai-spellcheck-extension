#ifndef __THBRK_UTILS_H
#define __THBRK_UTILS_H

#if defined(__GNUC__) && (__GNUC__ > 2) && defined(__OPTIMIZE__)
#define LIKELY(expr) (__builtin_expect (!!(expr), 1))
#define UNLIKELY(expr) (__builtin_expect (!!(expr), 0))
#else
#define LIKELY(expr) (expr)
#define UNLIKELY(expr) (expr)
#endif

#endif  /* __THBRK_UTILS_H */

