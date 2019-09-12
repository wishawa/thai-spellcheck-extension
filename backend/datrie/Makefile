CC := emcc
CXX := em++
CFLAGS := -I../include -static -s WASM=1 --emrun
CXXFLAGS := -I../include -static -s WASM=1 --emrun

srcfiles :=			\
	typedefs.h		\
	triedefs.h		\
	trie-private.h		\
	dstring.h		\
	dstring-private.h	\
	dstring.c		\
	trie-string.h		\
	trie-string.c		\
	fileutils.h		\
	fileutils.c		\
	darray.h		\
	darray.c		\
	tail.h			\
	tail.c			\
	trie.h			\
	trie.c			\
	alpha-map.h		\
	alpha-map-private.h	\
	alpha-map.c

objects :=		\
	dstring.o	\
	trie-string.o	\
	fileutils.o	\
	darray.o	\
	tail.o		\
	trie.o		\
	alpha-map.o

all: datrie

datrie: $(objects)
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o datrie.o $^

clean:
	rm -f $(objects)
	

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
