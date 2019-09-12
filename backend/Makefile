CC := emcc
CXX := em++
CFLAGS := -I./include -static -O2 -s WASM=1
CXXFLAGS := -I./include -static -O2 -s WASM=1


srcfiles :=		\
	thbrk.c		\
	thbrk-priv.h	\
	thbrk-utils.h	\
	brk-ctype.c	\
	brk-ctype.h	\
	brk-common.c	\
	brk-common.h	\
	brk-maximal.c	\
	brk-maximal.h	\
	thwchar.c	\
	thctype.c	\
	thwbrk.c

objects :=		\
	thbrk.o		\
	brk-ctype.o	\
	brk-common.o	\
	brk-maximal.o	\
	datrie/datrie.o	\
	thwchar.o	\
	thctype.o	\
	thwbrk.o

all: js

js: $(objects)
	$(CXX) $(CXXFLAGS) $(LDFLAGS) --preload-file thbrk.tri -s EXPORTED_FUNCTIONS='["_th_brk_new", "_th_brk_delete", "_th_brk_wc_find_breaks", "_th_brk_find_breaks"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "stringToUTF8", "stringToUTF16", "stringToUTF32", "getValue", "setValue", "writeArrayToMemory"]' -o out/thbrk.js $^

datrie/datrie.o:
	$(MAKE) -C datrie datrie

depend: .depend

.depend: $(srcfiles)
	rm -f ./.depend
	$(CXX) $(CXXFLAGS) -MM $^>>./.depend

clean:
	rm -f $(objects)
	$(MAKE) -C datrie clean

dist-clean: clean
	rm -f *~ .depend

include .depend
